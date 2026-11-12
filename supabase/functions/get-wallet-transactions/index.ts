// Wallet activity across Ethereum L1 + L2s via Etherscan V2 multichain API.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

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

const metadataCache = new Map<string, { expires: number; data: any }>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function call(key: string, chainid: number, action: string, address: string, n: number) {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainid}&module=account&action=${action}&address=${address}&page=1&offset=${n}&sort=desc&apikey=${key}`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
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
    const parsed = z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/), limit: z.number().int().min(1).max(200).default(50), chainOffset: z.number().int().min(0).max(7).optional() }).safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid activity request', transactions: [] }, 400);
    const { walletAddress, limit, chainOffset } = parsed.data;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return json({ error: 'Invalid EVM address', transactions: [] }, 400);
    const key = (Deno.env.get('ETHERSCAN_API_KEY') || '').trim();
    if (!key) return json({ error: 'ETHERSCAN_API_KEY not configured', transactions: [] }, 500);
    const addr = walletAddress.toLowerCase();
    const per = 25;
    const all: any[] = [];

    // Free tier: 3 req/sec — process chains sequentially, two calls per chain.
    const selectedChains = chainOffset === undefined ? CHAINS : CHAINS.slice(chainOffset, chainOffset + 2);
    for (const c of selectedChains) {
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
          transfers: v > 0 ? [{ type: out ? 'out' : 'in', quantity: v, symbol: c.symbol, name: c.symbol === 'ETH' ? 'Ethereum' : c.symbol, native: true, osChain: c.os, contract: '0x0000000000000000000000000000000000000000' }] : [],
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
    const iconMap = new Map<string, any>();
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
            const cached = metadataCache.get(k);
            if (cached && cached.expires > Date.now()) { iconMap.set(k, cached.data); return; }
            const r = await fetch(`https://api.opensea.io/api/v2/chain/${ch}/payment_token/${addr}`, { signal: AbortSignal.timeout(2500), headers: { 'X-API-KEY': osKey, Accept: 'application/json' } });
            if (r.ok) { const d = await r.json(); iconMap.set(k, d); metadataCache.set(k, { expires: Date.now() + 60000, data: d }); } else { console.warn('OpenSea metadata', ch, r.status, await r.text()); }
          } catch { /* skip */ }
        }));
      }
    }
    // Native asset fallback when OpenSea has no payment-token price.
    let nativePrices: Record<string, any> = {};
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,pol-ex-matic&vs_currencies=usd', { signal: AbortSignal.timeout(2000) });
      if (r.ok) nativePrices = await r.json(); else await r.text();
    } catch { /* Never fabricate a missing quote. */ }
    for (const tx of transactions) for (const tr of tx.transfers) {
      const metadata = iconMap.get(`${tr.osChain}:${tr.contract}`);
      tr.icon = metadata?.image || metadata?.image_url || (tr.native && tr.symbol === 'ETH' ? 'https://cdn.zerion.io/eth.png' : null);
      const price = Number(metadata?.price?.usd ?? metadata?.usd_price ?? metadata?.price_usd ?? (tr.native ? nativePrices[tr.symbol === 'ETH' ? 'ethereum' : 'pol-ex-matic']?.usd : undefined));
      tr.priceUsd = Number.isFinite(price) && price > 0 ? price : null;
      tr.usdValue = tr.priceUsd === null ? null : tr.quantity * tr.priceUsd;
      if (tr.native) delete tr.contract;
      delete tr.osChain;
    }
    return json({ transactions, total: transactions.length, nextChainOffset: chainOffset !== undefined && chainOffset + 2 < CHAINS.length ? chainOffset + 2 : null, valuation: 'current_price_estimate' });
  } catch (e) {
    return json({ error: (e as Error).message, transactions: [] }, 500);
  }
});
