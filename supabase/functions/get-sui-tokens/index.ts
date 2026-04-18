const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUI_RPC = 'https://fullnode.mainnet.sui.io:443';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { address } = await req.json();
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'address required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const r = await fetch(SUI_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'suix_getAllBalances', params: [address] }),
    });
    const j = await r.json();
    const balances = (j?.result || []).map((b: any) => {
      const coinType = b.coinType as string;
      const sym = (coinType.split('::').pop() || 'COIN').toUpperCase();
      const isSui = coinType === '0x2::sui::SUI';
      const decimals = isSui ? 9 : 9;
      const raw = BigInt(b.totalBalance || '0');
      const human = Number(raw) / Math.pow(10, decimals);
      return {
        chain: 'sui',
        symbol: sym,
        coinType,
        name: isSui ? 'Sui' : sym,
        balance: human,
        rawBalance: b.totalBalance,
        decimals,
      };
    });
    return new Response(JSON.stringify({ tokens: balances }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
