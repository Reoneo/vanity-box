import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyMessage } from 'https://esm.sh/viem@2.37.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, toAddress, walletAddress, signature, timestamp } = await req.json();

    if (!subdomain || !toAddress) {
      throw new Error('Missing required parameters: subdomain and toAddress');
    }

    // --- Signature verification ---
    if (!walletAddress || !signature || !timestamp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet signature required for domain transfer' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reject stale requests (5 min window)
    if (Date.now() - timestamp > 300_000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expectedMessage = [
      'Transfer domain',
      `Subdomain: ${subdomain}`,
      `To: ${toAddress}`,
      `Timestamp: ${timestamp}`,
    ].join('\n');

    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: expectedMessage,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid wallet signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- End signature verification ---

    console.log('🔄 DOMAIN TRANSFER – verified owner:', walletAddress);

    const parts = subdomain.split('.');
    const subdomainLabel = parts[0];
    const domainFromSubdomain = parts.slice(1).join('.');

    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Verify ownership via minted_domains
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: domainRecord } = await supabase
      .from('minted_domains')
      .select('wallet_address')
      .eq('full_name', subdomain.toLowerCase())
      .maybeSingle();

    if (domainRecord && domainRecord.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: 'You do not own this domain' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve API key
    let NAMESTONE_API_KEY: string | null = null;

    try {
      const { data: cfg, error: dbError } = await supabase
        .from('domain_configs')
        .select('api_key_secret_name, status')
        .eq('domain_name', domainFromSubdomain.toLowerCase())
        .single();

      if (!dbError && cfg && cfg.status === 'active' && cfg.api_key_secret_name) {
        NAMESTONE_API_KEY = Deno.env.get(cfg.api_key_secret_name) || null;
      }
    } catch (lookupErr) {
      console.log('ℹ️ Skipping domain_configs lookup:', lookupErr);
    }

    if (!NAMESTONE_API_KEY) {
      NAMESTONE_API_KEY = Deno.env.get(`NAMESTONE_API_KEY_${domainFromSubdomain.toUpperCase().replace(/\./g, '_')}`) || Deno.env.get('NAMESTONE_API_KEY') || null;
    }
    
    if (!NAMESTONE_API_KEY) {
      throw new Error(`API key not configured for domain ${domainFromSubdomain}`);
    }

    const namestonePayload = {
      domain: (domainFromSubdomain || 'smith.cash').toLowerCase(),
      name: subdomainLabel,
      address: toAddress,
      chain_id: 480,
    };

    const namestoneResponse = await fetch('https://namestone.com/api/public_v1/set-name', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(namestonePayload),
    });

    if (!namestoneResponse.ok) {
      const errorText = await namestoneResponse.text();
      throw new Error(`Namestone API error: ${namestoneResponse.status} - ${errorText}`);
    }

    const namestoneData = await namestoneResponse.json();
    console.log('✅ Domain transferred successfully via Namestone');

    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        newAddress: toAddress,
        namestoneData,
        message: 'Domain transferred successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in transfer-namestone-name:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
