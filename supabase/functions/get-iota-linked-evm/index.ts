// Edge Function: Resolve the linked EVM address for a .iota name
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let iotaName: string | undefined;

    try {
      const rawBody = await req.text();
      if (rawBody && rawBody.trim().length > 0) {
        const body = JSON.parse(rawBody);
        iotaName = body?.iotaName ?? body?.name;
      }
    } catch {
      // ignore malformed body and continue with query params fallback
    }

    if (!iotaName) {
      iotaName = url.searchParams.get('iotaName') ?? url.searchParams.get('name') ?? undefined;
    }

    iotaName = typeof iotaName === 'string' ? iotaName.trim().toLowerCase() : undefined;

    if (!iotaName) {
      return new Response(
        JSON.stringify({ success: false, evmAddress: null, error: 'iotaName is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from('iota_wallet_links')
      .select('evm_address, chain')
      .eq('iota_name', iotaName.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[get-iota-linked-evm] DB error:', error);
      return new Response(
        JSON.stringify({ success: false, evmAddress: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data?.evm_address) {
      return new Response(
        JSON.stringify({ success: true, evmAddress: data.evm_address, chain: data.chain || 'ethereum' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, evmAddress: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error resolving linked EVM:', error);
    return new Response(
      JSON.stringify({ success: false, evmAddress: null, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
