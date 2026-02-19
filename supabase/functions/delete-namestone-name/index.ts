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
    const { subdomain, domain: providedDomain, walletAddress, signature, timestamp } = await req.json();

    if (!subdomain) {
      throw new Error('Missing subdomain parameter');
    }
    if (!walletAddress) {
      throw new Error('Missing wallet address parameter');
    }

    // --- Signature verification ---
    if (!signature || !timestamp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet signature required for domain deletion' }),
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
      'Delete domain',
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

    console.log('🗑️ DELETE – verified owner:', walletAddress);

    const parts = subdomain.split('.');
    const subdomainLabel = parts[0];
    const domain = providedDomain || parts.slice(1).join('.') || 'smith.cash';

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify ownership via minted_domains
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
    let usedSecret = '';
    let NAMESTONE_API_KEY = '';

    try {
      const { data: cfg, error: cfgError } = await supabase
        .from('domain_configs')
        .select('api_key_secret_name')
        .eq('domain_name', domain.toLowerCase())
        .eq('status', 'active')
        .maybeSingle();

      if (!cfgError && cfg?.api_key_secret_name) {
        usedSecret = cfg.api_key_secret_name;
        NAMESTONE_API_KEY = Deno.env.get(cfg.api_key_secret_name) || '';
      }
    } catch (e) {
      console.warn('⚠️ domain_configs lookup failed:', e);
    }

    if (!NAMESTONE_API_KEY) {
      const envKeyExact = `NAMESTONE_API_KEY_${domain.toUpperCase().replace(/\./g, '_')}`;
      const baseLabel = domain.split('.')[0].toUpperCase();
      const envKeyBase = `NAMESTONE_API_KEY_${baseLabel}`;
      NAMESTONE_API_KEY =
        Deno.env.get(envKeyExact) ||
        Deno.env.get(envKeyBase) ||
        Deno.env.get('NAMESTONE_API_KEY') ||
        '';
    }
    
    if (!NAMESTONE_API_KEY) {
      throw new Error(`API key not configured for domain ${domain}`);
    }

    const payload = {
      domain: domain.toLowerCase(),
      name: subdomainLabel
    };

    const response = await fetch('https://namestone.com/api/public_v1/delete-name', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const lower = errorText.toLowerCase();
      if (lower.includes('name does not exist') || lower.includes('not found')) {
        console.warn('⚠️ Name not found on Namestone – proceeding with local cleanup.');
      } else {
        throw new Error(`Namestone API error: ${response.status} - ${errorText}`);
      }
    }

    let data: any = null;
    try {
      if (response.ok) {
        data = await response.json();
      } else {
        data = { softDeleted: true };
      }
    } catch (e) {
      data = { softDeleted: !response.ok };
    }

    // Delete from minted_domains
    try {
      const fullName = `${subdomainLabel}.${domain}`;
      const { data: primaryDel, error: deleteError } = await supabase
        .from('minted_domains')
        .delete()
        .eq('full_name', fullName)
        .eq('wallet_address', walletAddress.toLowerCase())
        .select('id');

      if (deleteError) {
        console.error('⚠️ Delete error (wallet scoped):', deleteError);
      } else if (!primaryDel || primaryDel.length === 0) {
        await supabase
          .from('minted_domains')
          .delete()
          .eq('full_name', fullName);
      }
    } catch (dbError) {
      console.error('⚠️ Database cleanup error:', dbError);
    }

    return new Response(
      JSON.stringify({ success: true, subdomain, data, message: 'Name deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in delete-namestone-name:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
