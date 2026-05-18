// Edge Function: Reverse lookup — find the .iota name linked to an EVM address.
// Accepts either an `evmAddress` directly OR a `searchedName` (e.g. smith.box)
// which it will resolve to an EVM address via the resolve-profile function.
// Strategy:
//   1. Query the denormalized `iota_cross_chain_profiles` cache (instant).
//   2. Fallback to `iota_wallet_links` with OR-clause across candidates.
//   3. Final fallback: explicit eq() query on the first candidate.
//   4. Retries DB errors once with 250ms backoff.
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

function normalizeIotaName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = String(raw).toLowerCase().trim();
  if (!lower) return null;
  const bare = lower.includes(':') ? lower.split(':')[0] : lower;
  // Raw IOTA hex address (passkey wallet without a .iota domain) — return as-is
  if (/^0x[a-f0-9]{64}$/.test(bare)) return bare;
  return bare.endsWith('.iota') ? bare : `${bare}.iota`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

    // Build a candidate address list (lowercased + trimmed).
    const candidates = new Set<string>();
    const tryAdd = (raw: any) => {
      if (typeof raw !== 'string') return;
      const v = raw.trim();
      if (EVM_RE.test(v)) candidates.add(v.toLowerCase());
    };
    tryAdd(evmAddress);
    if (evmAddresses) for (const a of evmAddresses) tryAdd(a);

    // Fallback: resolve a searched name to an EVM address
    if (candidates.size === 0 && searchedName && typeof searchedName === 'string') {
      try {
        const { data: resolved } = await supabase.functions.invoke('resolve-profile', {
          body: { query: searchedName.trim() },
        });
        tryAdd(resolved?.profile?.address);
        tryAdd(resolved?.profile?.ensRecords?.address);
        tryAdd(resolved?.profile?.links?.ethereum);
        const recs = resolved?.profile?.records || {};
        for (const k of Object.keys(recs)) {
          if (k.toLowerCase().includes('eth')) tryAdd(recs[k]);
        }
      } catch (e) {
        console.log('[get-iota-name-by-evm] resolve-profile fallback failed:', (e as any)?.message);
      }
    }

    if (candidates.size === 0) {
      return jsonResp({ success: false, iotaName: null, error: 'no valid evm address candidates' });
    }

    const list = Array.from(candidates);
    console.log('[get-iota-name-by-evm] candidates:', list);

    // ── Step 1: denormalized cache lookup (single indexed query) ──
    try {
      const { data: cacheRows, error: cacheErr } = await supabase
        .from('iota_cross_chain_profiles')
        .select('iota_name, evm_address')
        .in('evm_address', list)
        .limit(1);
      if (!cacheErr && cacheRows && cacheRows.length > 0) {
        const iotaName = normalizeIotaName(cacheRows[0].iota_name);
        console.log('[get-iota-name-by-evm] cache hit:', iotaName);
        if (iotaName) {
          return jsonResp({
            success: true,
            iotaName,
            chain: 'ethereum',
            matchedAddress: cacheRows[0].evm_address,
            source: 'cache',
          });
        }
      }
    } catch (e) {
      console.log('[get-iota-name-by-evm] cache lookup error:', (e as any)?.message);
    }

    // ── Step 2: iota_wallet_links OR scan with retry ──
    const orClause = list.map((a) => `evm_address.ilike.${a}`).join(',');
    console.log('[get-iota-name-by-evm] OR clause:', orClause);

    const runQuery = async () =>
      await supabase
        .from('iota_wallet_links')
        .select('iota_name, chain, evm_address')
        .or(orClause)
        .limit(50);

    let { data, error } = await runQuery();
    if (error) {
      console.error('[get-iota-name-by-evm] DB error (attempt 1), retrying:', error);
      await sleep(250);
      const retry = await runQuery();
      data = retry.data;
      error = retry.error;
    }

    // ── Step 3: explicit eq fallback ──
    if ((error || !data || data.length === 0) && list[0]) {
      console.log('[get-iota-name-by-evm] OR returned nothing, trying explicit eq');
      const { data: eqData } = await supabase
        .from('iota_wallet_links')
        .select('iota_name, chain, evm_address')
        .eq('evm_address', list[0])
        .eq('chain', 'ethereum')
        .limit(1);
      if (eqData && eqData.length > 0) {
        data = eqData;
        error = null;
      }
    }

    console.log('[get-iota-name-by-evm] returned rows:', data?.length ?? 0);

    if (error) {
      console.error('[get-iota-name-by-evm] DB error (final):', error);
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

    const iotaName = normalizeIotaName(sorted[0].iota_name);

    return jsonResp({
      success: !!iotaName,
      iotaName,
      chain: sorted[0].chain || 'ethereum',
      matchedAddress: sorted[0].evm_address,
      source: 'wallet_links',
    });
  } catch (error: any) {
    console.error('❌ Error in get-iota-name-by-evm:', error);
    return jsonResp({ success: false, iotaName: null, error: error.message }, 500);
  }
});
