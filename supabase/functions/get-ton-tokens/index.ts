// Edge Function: Fetch TON Jetton token balances for a wallet address via TonAPI
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface JettonBalance {
  balance: string;
  wallet_address?: { address: string };
  jetton: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image?: string;
    verification?: string;
  };
  price?: {
    prices?: { USD?: number };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json().catch(() => ({}));

    if (!walletAddress || typeof walletAddress !== 'string') {
      return new Response(JSON.stringify({ error: 'walletAddress is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch native TON balance
    const tonBalanceUrl = `https://tonapi.io/v2/accounts/${encodeURIComponent(walletAddress)}`;
    // 2. Fetch Jetton balances
    const jettonsUrl = `https://tonapi.io/v2/accounts/${encodeURIComponent(walletAddress)}/jettons?currencies=usd`;

    console.log('[get-ton-tokens] Fetching TON balance + Jettons for:', walletAddress.slice(0, 12) + '...');

    const [tonRes, jettonsRes] = await Promise.all([
      fetch(tonBalanceUrl, { headers: { 'Accept': 'application/json' } }),
      fetch(jettonsUrl, { headers: { 'Accept': 'application/json' } }),
    ]);

    const tokens: any[] = [];
    let totalValue = 0;

    // Parse native TON balance
    if (tonRes.ok) {
      const tonData = await tonRes.json();
      const balanceNano = BigInt(tonData.balance || '0');
      const balanceTon = Number(balanceNano) / 1e9;

      if (balanceTon > 0) {
        // Try to get TON price from the API or use a rough estimate
        let tonUsdValue = 0;
        try {
          const ratesRes = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd', {
            headers: { 'Accept': 'application/json' },
          });
          if (ratesRes.ok) {
            const ratesData = await ratesRes.json();
            const tonPrice = ratesData?.rates?.TON?.prices?.USD || 0;
            tonUsdValue = balanceTon * tonPrice;
          }
        } catch {
          // Price fetch failed, continue without USD value
        }

        tokens.push({
          id: 'ton-native',
          chain: 'ton',
          name: 'Toncoin',
          symbol: 'TON',
          icon: 'https://ton.org/download/ton_symbol.png',
          quantity: balanceTon,
          value: tonUsdValue,
          decimals: 9,
        });
        totalValue += tonUsdValue;
      }
    }

    // Parse Jetton balances
    if (jettonsRes.ok) {
      const jettonsData = await jettonsRes.json();
      const balances: JettonBalance[] = Array.isArray(jettonsData?.balances) ? jettonsData.balances : [];

      for (const item of balances) {
        const rawBalance = BigInt(item.balance || '0');
        const decimals = item.jetton.decimals || 9;
        const quantity = Number(rawBalance) / Math.pow(10, decimals);

        if (quantity <= 0) continue;

        const usdPrice = item.price?.prices?.USD || 0;
        const usdValue = quantity * usdPrice;

        tokens.push({
          id: `ton-jetton-${item.jetton.address}`,
          chain: 'ton',
          name: item.jetton.name || 'Unknown Token',
          symbol: item.jetton.symbol || '???',
          icon: item.jetton.image || '',
          quantity,
          value: usdValue,
          decimals,
          verified: item.jetton.verification === 'whitelist',
        });
        totalValue += usdValue;
      }
    }

    // Sort by USD value descending
    tokens.sort((a, b) => (b.value || 0) - (a.value || 0));

    console.log('[get-ton-tokens] Found', tokens.length, 'tokens, total value: $' + totalValue.toFixed(2));

    return new Response(JSON.stringify({ tokens, totalValue, count: tokens.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[get-ton-tokens] Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
