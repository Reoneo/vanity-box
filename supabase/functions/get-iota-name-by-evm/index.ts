// Edge Function: Reverse lookup — find the .iota name linked to an EVM address
// Used to overlay ENS/EVM domain branding on top of an IOTA profile when searching
// an Ethereum domain whose resolved address has been linked to a vanity.iota profile.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let evmAddress: string | undefined;

    try {
      const rawBody = await req.text();
      if (rawBody && rawBody.trim().length > 0) {
        const body = JSON.parse(rawBody);
        evmAddress = body?.evmAddress ?? body?.address;
      }
    } catch {
      // ignore malformed body, fall back to query params
    }

    if (!evmAddress) {
      evmAddress =
        url.searchParams.get('evmAddress') ?? url.searchParams.get('address') ?? undefined;
    }

    evmAddress = typeof evmAddress === 'string' ? evmAddress.trim().toLowerCase() : undefined;

    if (!evmAddress || !/^0x[a-f0-9]{40}$/i.test(evmAddress)) {
      return new Response(
        JSON.stringify({ success: false, iotaName: null, error: 'valid evmAddress is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // iota_wallet_links may store rows as either "name" or "name:chain". The Ethereum
    // link inserted by issue-ethereum-vc uses just the bare iota name.
    const { data, error } = await supabase
      .from('iota_wallet_links')
      .select('iota_name, chain, evm_address')
      .ilike('evm_address', evmAddress)
      .limit(20);

    if (error) {
      console.error('[get-iota-name-by-evm] DB error:', error);
      return new Response(
        JSON.stringify({ success: false, iotaName: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, iotaName: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prefer Ethereum links first, then any other chain. Strip ":chain" suffix.
    const sorted = [...data].sort((a, b) => {
      const aEth = (a.chain || '').toLowerCase() === 'ethereum' ? 0 : 1;
      const bEth = (b.chain || '').toLowerCase() === 'ethereum' ? 0 : 1;
      return aEth - bEth;
    });

    const raw = String(sorted[0].iota_name || '').toLowerCase();
    const bare = raw.includes(':') ? raw.split(':')[0] : raw;
    const iotaName = bare.endsWith('.iota') ? bare : `${bare}.iota`;

    return new Response(
      JSON.stringify({ success: true, iotaName, chain: sorted[0].chain || 'ethereum' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error in get-iota-name-by-evm:', error);
    return new Response(
      JSON.stringify({ success: false, iotaName: null, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
