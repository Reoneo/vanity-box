import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API key will be fetched based on domain

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, domain: providedDomain, walletAddress } = await req.json();

    console.log('==========================================');
    console.log('🗑️  DELETING NAMESTONE NAME');
    console.log('==========================================');
    console.log('📝 Subdomain:', subdomain);
    console.log('📝 Wallet Address:', walletAddress);
    console.log('==========================================');

    if (!subdomain) {
      throw new Error('Missing subdomain parameter');
    }
    
    if (!walletAddress) {
      throw new Error('Missing wallet address parameter');
    }

    // Extract subdomain label and domain
    const parts = subdomain.split('.');
    const subdomainLabel = parts[0];
    const domain = providedDomain || parts.slice(1).join('.') || 'smith.cash';

    // Resolve API key for this domain using domain_configs first, then env fallbacks
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let usedSecret = '';
    let NAMESTONE_API_KEY = '';

    try {
      const { data: cfg, error: cfgError } = await supabase
        .from('domain_configs')
        .select('api_key_secret_name')
        .eq('domain_name', domain.toLowerCase())
        .eq('status', 'active')
        .maybeSingle();

      if (cfgError) {
        console.warn('⚠️ Could not read domain_configs:', cfgError);
      }
      if (cfg?.api_key_secret_name) {
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
      usedSecret = NAMESTONE_API_KEY ? (NAMESTONE_API_KEY === Deno.env.get('NAMESTONE_API_KEY') ? 'NAMESTONE_API_KEY' : `${envKeyExact} or ${envKeyBase}`) : usedSecret;
    }
    
    if (!NAMESTONE_API_KEY) {
      throw new Error(`API key not configured for domain ${domain}`);
    }
    
    console.log('🔑 Using API key for domain via', usedSecret || 'domain_configs', '→', domain);
    console.log('📝 Domain:', domain);
    
    const payload = {
      domain: domain.toLowerCase(),
      name: subdomainLabel
    };

    console.log('📤 Sending delete request to Namestone:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://namestone.com/api/public_v1/delete-name', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Namestone response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NAMESTONE API ERROR');
      console.error('Status:', response.status);
      console.error('Error message:', errorText);
      throw new Error(`Namestone API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Name deleted successfully:', JSON.stringify(data, null, 2));

    // Also delete from minted_domains table to keep database in sync
    try {
      // Supabase client already initialized above

      const fullName = `${subdomainLabel}.${domain}`;
      console.log('🗃️  Deleting from database:', { fullName, walletAddress: walletAddress.toLowerCase() });
      
      const { error: deleteError } = await supabase
        .from('minted_domains')
        .delete()
        .eq('full_name', fullName)
        .eq('wallet_address', walletAddress.toLowerCase());

      if (deleteError) {
        console.error('⚠️ Error deleting from minted_domains:', deleteError);
      } else {
        console.log('✅ Also deleted from minted_domains table');
      }
    } catch (dbError) {
      console.error('⚠️ Database cleanup error:', dbError);
      // Don't fail the whole request if DB cleanup fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        data,
        message: 'Name deleted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in delete-namestone-name function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});