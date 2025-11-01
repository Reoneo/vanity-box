import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const { domain } = req.method === 'GET' ? Object.fromEntries(url.searchParams) : await req.json();

    if (!domain) {
      return new Response(JSON.stringify({ success: false, error: 'Missing domain parameter' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const normalized = String(domain).toLowerCase();

    // Resolve API key using domain_configs first, then env fallbacks
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let NAMESTONE_API_KEY = '';
    let usedSecret = '';

    try {
      const { data: cfg } = await supabase
        .from('domain_configs')
        .select('api_key_secret_name')
        .eq('domain_name', normalized)
        .eq('status', 'active')
        .maybeSingle();
      if (cfg?.api_key_secret_name) {
        usedSecret = cfg.api_key_secret_name;
        NAMESTONE_API_KEY = Deno.env.get(cfg.api_key_secret_name) || '';
      }
    } catch (e) {
      console.warn('⚠️ domain_configs lookup failed:', e);
    }

    if (!NAMESTONE_API_KEY) {
      const envKeyExact = `NAMESTONE_API_KEY_${normalized.toUpperCase().replace(/\./g, '_')}`;
      const baseLabel = normalized.split('.')[0].toUpperCase();
      const envKeyBase = `NAMESTONE_API_KEY_${baseLabel}`;
      NAMESTONE_API_KEY =
        Deno.env.get(envKeyExact) ||
        Deno.env.get(envKeyBase) ||
        Deno.env.get('NAMESTONE_API_KEY') || '';
      usedSecret = NAMESTONE_API_KEY ? (NAMESTONE_API_KEY === Deno.env.get('NAMESTONE_API_KEY') ? 'NAMESTONE_API_KEY' : `${envKeyExact} or ${envKeyBase}`) : usedSecret;
    }

    if (!NAMESTONE_API_KEY) {
      throw new Error(`API key not configured for domain ${normalized}`);
    }

    console.log('🔎 Fetching NameStone domain data for', normalized, 'using', usedSecret || 'domain_configs');

    const apiRes = await fetch(`https://namestone.com/api/public_v1/get-domain?domain=${encodeURIComponent(normalized)}`, {
      method: 'GET',
      headers: {
        'Authorization': NAMESTONE_API_KEY,
      },
    });

    const text = await apiRes.text();
    let json: any = undefined;
    try { json = JSON.parse(text); } catch { /* leave as text */ }

    if (!apiRes.ok) {
      console.error('❌ NameStone get-domain error', apiRes.status, text);
      return new Response(JSON.stringify({ success: false, error: json?.error || text || `HTTP ${apiRes.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Return passthrough data
    return new Response(JSON.stringify({ success: true, data: json }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in get-namestone-domain:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});