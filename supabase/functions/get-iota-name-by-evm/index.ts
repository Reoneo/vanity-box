// Edge Function: Reverse lookup — find the .iota name linked to an EVM address.
// Accepts either an `evmAddress` directly OR a `searchedName` (e.g. smith.box)
// which it will resolve to an EVM address via the resolve-profile function.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EVM_RE = /^0x[a-f0-9]{40}$/i;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let evmAddress: string | undefined;
    let evmAddresses: string[] | undefined;
    let searchedName: string | undefined;

    try {
      const rawBody = await req.text();
      if (rawBody && rawBody.trim().length > 0) {
        const body = JSON.parse(rawBody);
        evmAddress = body?.evmAddress ?? body?.address;
        evmAddresses = Array.isArray(body?.evmAddresses) ? body.evmAddresses : undefined;
        searchedName = body?.searchedName ?? body?.name;
      }
    } catch {
      // ignore malformed body, fall back to query params
    }

    if (!evmAddress) {
      evmAddress =
        url.searchParams.get('evmAddress') ?? url.searchParams.get('address') ?? undefined;
    }
    if (!searchedName) {
      searchedName = url.searchParams.get('searchedName') ?? url.searchParams.get('name') ?? undefined;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Build a candidate address list
    const candidates = new Set<string>();
    if (evmAddress && EVM_RE.test(String(evmAddress).trim())) {
      candidates.add(String(evmAddress).trim().toLowerCase());
    }
    if (evmAddresses) {
      for (const a of evmAddresses) {
        if (typeof a === 'string' && EVM_RE.test(a.trim())) {
          candidates.add(a.trim().toLowerCase());
        }
      }
    }

    // Fallback: resolve a searched name to an EVM address
    if (candidates.size === 0 && searchedName && typeof searchedName === 'string') {
      try {
        const { data: resolved } = await supabase.functions.invoke('resolve-profile', {
          body: { query: searchedName.trim() },
        });
        const addr: string | undefined = resolved?.profile?.address;
        if (addr && EVM_RE.test(addr)) candidates.add(addr.toLowerCase());
        const recAddr: string | undefined = resolved?.profile?.ensRecords?.address;
        if (recAddr && EVM_RE.test(recAddr)) candidates.add(recAddr.toLowerCase());
      } catch (e) {
        console.log('[get-iota-name-by-evm] resolve-profile fallback failed:', (e as any)?.message);
      }
    }

    if (candidates.size === 0) {
      return jsonResp({ success: false, iotaName: null, error: 'no valid evm address candidates' });
    }

    const list = Array.from(candidates);
    console.log('[get-iota-name-by-evm] candidates:', list);

    // Build OR clause matching evm_address case-insensitively for any candidate
    const orClause = list.map((a) => `evm_address.ilike.${a}`).join(',');

    const { data, error } = await supabase
      .from('iota_wallet_links')
      .select('iota_name, chain, evm_address')
      .or(orClause)
      .limit(50);

    if (error) {
      console.error('[get-iota-name-by-evm] DB error:', error);
      return jsonResp({ success: false, iotaName: null });
    }

    if (!data || data.length === 0) {
      return jsonResp({ success: false, iotaName: null });
    }

    // Prefer Ethereum links first, then any other chain.
    const sorted = [...data].sort((a, b) => {
      const aEth = (a.chain || '').toLowerCase() === 'ethereum' ? 0 : 1;
      const bEth = (b.chain || '').toLowerCase() === 'ethereum' ? 0 : 1;
      return aEth - bEth;
    });

    const raw = String(sorted[0].iota_name || '').toLowerCase();
    const bare = raw.includes(':') ? raw.split(':')[0] : raw;
    const iotaName = bare.endsWith('.iota') ? bare : `${bare}.iota`;

    return jsonResp({
      success: true,
      iotaName,
      chain: sorted[0].chain || 'ethereum',
      matchedAddress: sorted[0].evm_address,
    });
  } catch (error: any) {
    console.error('❌ Error in get-iota-name-by-evm:', error);
    return jsonResp({ success: false, iotaName: null, error: error.message }, 500);
  }
});
