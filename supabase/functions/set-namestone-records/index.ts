import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const { subdomain, walletAddress, textRecords, coinTypes, contenthash, signature, timestamp } = await req.json();

    if (!subdomain || !walletAddress) {
      throw new Error('Missing required parameters');
    }

    // --- Signature verification ---
    if (!signature || !timestamp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet signature required to modify records' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (Date.now() - timestamp > 300_000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expectedMessage = [
      'Update domain records',
      `Subdomain: ${subdomain}`,
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

    console.log('🔄 SET RECORDS – verified owner:', walletAddress);

    const parts = subdomain.split('.');
    const subdomainLabel = parts[0].trim().toLowerCase();
    const cleanDomain = (parts.slice(1).join('.') || 'smith.cash').trim().toLowerCase();

    // Verify ownership via minted_domains
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data: domainConfig } = await supabase
      .from("domain_configs")
      .select("*")
      .eq("domain_name", cleanDomain)
      .eq("status", "active")
      .maybeSingle();

    let namestoneApiKey: string | undefined;
    if (domainConfig) {
      namestoneApiKey = Deno.env.get(domainConfig.api_key_secret_name);
    } else {
      namestoneApiKey = Deno.env.get("NAMESTONE_API_KEY");
    }
    
    if (!namestoneApiKey) {
      throw new Error(`API key not configured for domain ${cleanDomain}`);
    }

    const payload = {
      domain: cleanDomain,
      names: [
        {
          name: subdomainLabel,
          address: walletAddress,
          text_records: textRecords || {},
          coin_types: coinTypes || {},
          contenthash: contenthash || undefined
        }
      ]
    };

    const response = await fetch('https://namestone.com/api/public_v1/set-names', {
      method: 'POST',
      headers: {
        'Authorization': namestoneApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        throw new Error(`API key not authorized for domain "${cleanDomain}".`);
      }
      throw new Error(`Namestone API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, subdomain, data, message: 'Records updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in set-namestone-records:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
