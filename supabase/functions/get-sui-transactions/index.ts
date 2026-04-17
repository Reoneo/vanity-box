import { corsHeaders } from '@supabase/supabase-js/cors'

const SUI_RPC = 'https://fullnode.mainnet.sui.io:443';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { address, limit = 25 } = await req.json();
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'address required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const body = {
      jsonrpc: '2.0', id: 1, method: 'suix_queryTransactionBlocks',
      params: [
        { filter: { FromAddress: address }, options: { showInput: true, showEffects: true, showBalanceChanges: true } },
        null, Math.min(50, Number(limit) || 25), true,
      ],
    };
    const r = await fetch(SUI_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const txs = (j?.result?.data || []).map((t: any) => ({
      hash: t.digest,
      timestamp: t.timestampMs ? Number(t.timestampMs) : null,
      sender: t?.transaction?.data?.sender,
      status: t?.effects?.status?.status || 'unknown',
      gasFee: t?.effects?.gasUsed,
      balanceChanges: t?.balanceChanges || [],
      chain: 'sui',
    }));
    return new Response(JSON.stringify({ transactions: txs }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
