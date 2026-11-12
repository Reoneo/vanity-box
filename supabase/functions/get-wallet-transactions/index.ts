// Wallet activity across Ethereum L1 + L2s via Etherscan V2 multichain API.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHAINS: { id: number; name: string; symbol: string; os?: string; explorer: string }[] = [
  { id: 1, name: 'ethereum', symbol: 'ETH', os: 'ethereum', explorer: 'https://etherscan.io' },
  { id: 8453, name: 'base', symbol: 'ETH', os: 'base', explorer: 'https://basescan.org' },
  { id: 10, name: 'optimism', symbol: 'ETH', os: 'optimism', explorer: 'https://optimistic.etherscan.io' },
  { id: 42161, name: 'arbitrum', symbol: 'ETH', os: 'arbitrum', explorer: 'https://arbiscan.io' },
  { id: 137, name: 'polygon', symbol: 'POL', os: 'matic', explorer: 'https://polygonscan.com' },
  { id: 59144, name: 'linea', symbol: 'ETH', os: 'linea', explorer: 'https://lineascan.build' },
  { id: 534352, name: 'scroll', symbol: 'ETH', os: 'scroll', explorer: 'https://scrollscan.com' },
  { id: 480, name: 'world', symbol: 'ETH', os: 'world', explorer: 'https://worldscan.org' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function call(key: string, chainid: number, action: string, address: string, n: number) {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainid}&module=account&action=${action}&address=${address}&page=1&offset=${n}&sort=desc&apikey=${key}`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      const d = await r.json();
      if (Array.isArray(d.result)) return d.result;
      if (typeof d.result === 'string' && /rate limit/i.test(d.result)) { await sleep(600 * (i + 1)); continue; }
      return [];
    } catch { await sleep(400); }
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { walletAddress, limit = 50 } = await req.json();
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return json({ error: 'Invalid EVM address', transactions: [] }, 400);
    const key = (Deno.env.get('ETHERSCAN_API_KEY') || '').trim();
    if (!key) return json({ error: 'ETHERSCAN_API_KEY not configured', transactions: [] }, 500);
    const addr = walletAddress.toLowerCase();
    const per = 25;
    const all: any[] = [];

    // Free tier: 3 req/sec — process chains sequentially, two calls per chain.
    for (const c of CHAINS) {
      const [normal, tokens] = await Promise.all([
        call(key, c.id, 'txlist', addr, per),
        call(key, c.id, 'tokentx', addr, per),
      ]);
      const byHash = new Map<string, any>();
      for (const t of normal) {
        const v = Number(t.value) / 1e18;
        const out = t.from?.toLowerCase() === addr;
        const fee = (Number(t.gasUsed) * Number(t.gasPrice)) / 1e18;
        byHash.set(t.hash, {
          id: `${c.name}-${t.hash}`,
          hash: t.hash,
          status: t.isError === '1' ? 'failed' : 'confirmed',
          type: t.functionName ? (t.functionName.split('(')[0] || (out ? 'send' : 'receive')) : (out ? 'send' : 'receive'),
          minedAt: new Date(Number(t.timeStamp) * 1000).toISOString(),
          sentFrom: t.from, sentTo: t.to,
          fee: { value: out ? fee : 0, symbol: c.symbol },
          transfers: v > 0 ? [{ type: out ? 'out' : 'in', quantity: v, symbol: c.symbol, name: c.symbol === 'ETH' ? 'Ethereum' : c.symbol, native: true }] : [],
          method: t.functionName ? t.functionName.split('(')[0] : null,
          blockNumber: Number(t.blockNumber),
          explorerUrl: `${c.explorer}/tx/${t.hash}`,
          chain: c.name,
        });
      }
      for (const t of tokens) {
        const out = t.from?.toLowerCase() === addr;
        const q = Number(t.value) / Math.pow(10, Number(t.tokenDecimal || 18));
        const tr: any = { type: out ? 'out' : 'in', quantity: q, symbol: t.tokenSymbol, name: t.tokenName, contract: t.contractAddress?.toLowerCase(), osChain: c.os };
        const ex = byHash.get(t.hash);
        if (ex) { ex.transfers.push(tr); if (/^(transfer|send|receive)$/i.test(ex.type)) ex.type = out ? 'send' : 'receive'; continue; }
        byHash.set(t.hash, {
          id: `${c.name}-${t.hash}`, hash: t.hash, status: 'confirmed',
          type: out ? 'send' : 'receive',
          minedAt: new Date(Number(t.timeStamp) * 1000).toISOString(),
          sentFrom: t.from, sentTo: t.to, fee: { value: 0, symbol: c.symbol },
          transfers: [tr], chain: c.name, blockNumber: Number(t.blockNumber), explorerUrl: `${c.explorer}/tx/${t.hash}`,
        });
      }
      all.push(...byHash.values());
      await sleep(350);
    }

    all.sort((a, b) => (a.minedAt < b.minedAt ? 1 : -1));
    const transactions = all.slice(0, Math.min(Number(limit) || 50, 200));
    // Token icons from OpenSea (payment token metadata), deduped and capped.
    const osKey = (Deno.env.get('OPENSEA_API_KEY') || '').trim();
    const iconMap = new Map<string, string | null>();
    const wanted: string[] = [];
    for (const tx of transactions) for (const tr of tx.transfers) {
      if (tr.contract && tr.osChain) { const k = `${tr.osChain}:${tr.contract}`; if (!iconMap.has(k)) { iconMap.set(k, null); wanted.push(k); } }
    }
    if (osKey) {
      const list = wanted.slice(0, 40);
      for (let i = 0; i < list.length; i += 5) {
        await Promise.all(list.slice(i, i + 5).map(async (k) => {
          const [ch, addr] = k.split(':');
          try {
            const r = await fetch(`https://api.opensea.io/api/v2/chain/${ch}/payment_token/${addr}`, { headers: { 'X-API-KEY': osKey, Accept: 'application/json' } });
            if (r.ok) { const d = await r.json(); iconMap.set(k, d.image || d.image_url || null); }
          } catch { /* skip */ }
        }));
      }
    }
    for (const tx of transactions) for (const tr of tx.transfers) {
      if (tr.native) tr.icon = 'https://cdn.zerion.io/eth.png';
      else if (tr.contract) tr.icon = iconMap.get(`${tr.osChain}:${tr.contract}`) || null;
      delete tr.osChain;
    }
    return json({ transactions, total: transactions.length });
  } catch (e) {
    return json({ error: (e as Error).message, transactions: [] }, 500);
  }
});
