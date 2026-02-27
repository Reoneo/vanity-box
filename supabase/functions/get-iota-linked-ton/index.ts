// Edge Function: Resolve the linked TON address for a .iota name
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let iotaName: string | undefined;

    try {
      const body = await req.json();
      iotaName = body?.iotaName ?? body?.name;
    } catch {}

    iotaName = typeof iotaName === 'string' ? iotaName.trim().toLowerCase() : undefined;

    if (!iotaName) {
      return new Response(
        JSON.stringify({ success: false, tonAddress: null, error: 'iotaName is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // TON links are stored with iota_name = "name:ton"
    const { data, error } = await supabase
      .from('iota_wallet_links')
      .select('evm_address, chain')
      .eq('iota_name', `${iotaName}:ton`)
      .eq('chain', 'ton')
      .maybeSingle();

    if (error) {
      console.error('[get-iota-linked-ton] DB error:', error);
      return new Response(
        JSON.stringify({ success: false, tonAddress: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data?.evm_address) {
      console.log(`[get-iota-linked-ton] Found TON link: ${iotaName} → ${data.evm_address}`);
      return new Response(
        JSON.stringify({ success: true, tonAddress: data.evm_address }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, tonAddress: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[get-iota-linked-ton] Error:', error);
    return new Response(
      JSON.stringify({ success: false, tonAddress: null, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
