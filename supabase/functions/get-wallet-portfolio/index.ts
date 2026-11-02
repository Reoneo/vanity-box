import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Wallet token balances via OpenSea API v2: GET /api/v2/account/{address}/tokens
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress } = await req.json();
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return json({ error: 'Valid EVM walletAddress is required', tokens: [], totalValue: 0 }, 400);
    }

    const key = (Deno.env.get('OPENSEA_API_KEY') || '').trim();
    if (!key) return json({ error: 'OPENSEA_API_KEY not configured', tokens: [], totalValue: 0 }, 500);

    const all: any[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const url = new URL(`https://api.opensea.io/api/v2/account/${walletAddress}/tokens`);
      url.searchParams.set('limit', '100');
      url.searchParams.set('sort_by', 'usd_value');
      url.searchParams.set('sort_direction', 'desc');
      if (cursor) url.searchParams.set('cursor', cursor);

      let res: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await fetch(url, { headers: { 'X-API-KEY': key, Accept: 'application/json' } });
        if (res.status !== 429) break;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
      if (!res || !res.ok) {
        const text = res ? await res.text() : 'no response';
        console.error(`OpenSea tokens error [${res?.status}]: ${text}`);
        if (all.length) break;
        return json({ tokens: [], totalValue: 0, error: `OpenSea API error: ${res?.status}`, details: text });
      }
      const data = await res.json();
      all.push(...(data.token_balances || []));
      cursor = data.next || null;
      if (!cursor) break;
    }

    const tokens = all
      .map((t) => ({
        id: `${t.chain}:${t.address}`,
        name: t.name || 'Unknown Token',
        symbol: t.symbol || '???',
        icon: t.image_url || null,
        quantity: num(t.quantity),
        value: num(t.usd_value),
        price: num(t.usd_price),
        chain: t.chain || 'unknown',
        address: t.address,
        url: t.opensea_url || null,
        priceChange24h: 0,
      }))
      .filter((t) => t.quantity > 0);

    const totalValue = tokens.reduce((s, t) => s + t.value, 0);
    return json({ tokens, totalValue, source: 'opensea' });
  } catch (error) {
    console.error('get-wallet-portfolio error:', error);
    return json({ error: (error as Error).message, tokens: [], totalValue: 0 }, 500);
  }
});
