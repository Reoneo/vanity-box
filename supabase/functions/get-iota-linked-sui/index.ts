// Edge Function: Resolve the linked Sui address for a .iota name
// Sui links are stored in iota_wallet_links with iota_name = "<name>:sui"
// and the Sui address is in the evm_address column (re-used for any chain).
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
        JSON.stringify({ success: false, suiAddress: null, error: 'iotaName is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from('iota_wallet_links')
      .select('evm_address, chain')
      .eq('iota_name', `${iotaName}:sui`)
      .eq('chain', 'sui')
      .maybeSingle();

    if (error) {
      console.error('[get-iota-linked-sui] DB error:', error);
      return new Response(
        JSON.stringify({ success: false, suiAddress: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data?.evm_address) {
      console.log(`[get-iota-linked-sui] Found Sui link: ${iotaName} → ${data.evm_address}`);
      return new Response(
        JSON.stringify({ success: true, suiAddress: data.evm_address }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, suiAddress: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[get-iota-linked-sui] Error:', error);
    return new Response(
      JSON.stringify({ success: false, suiAddress: null, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
