// Edge function to fetch IOTA tokens/coins via native IOTA JSON-RPC API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IOTA_RPC_URL = "https://api.mainnet.iota.cafe";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "walletAddress is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-iota-tokens] Fetching balances for ${walletAddress}`);

    // Use IOTA native RPC to get all balances
    const response = await fetch(IOTA_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "iotax_getAllBalances",
        params: [walletAddress],
      }),
    });

    if (!response.ok) {
      console.error("IOTA RPC error:", response.status);
      return new Response(
        JSON.stringify({ error: `RPC error: ${response.status}`, tokens: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    if (data.error) {
      console.error("IOTA RPC error:", data.error);
      return new Response(
        JSON.stringify({ error: data.error.message, tokens: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const balances = data.result || [];
    console.log(`[get-iota-tokens] Found ${balances.length} coin types`);

    // Fetch IOTA price from CoinGecko
    let iotaPriceUsd: number | null = null;
    let iotaPriceChange24h: number | null = null;
    try {
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=iota&vs_currencies=usd&include_24hr_change=true"
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        iotaPriceUsd = priceData?.iota?.usd ?? null;
        iotaPriceChange24h = priceData?.iota?.usd_24h_change ?? null;
        console.log(`[get-iota-tokens] IOTA price: $${iotaPriceUsd}, 24h: ${iotaPriceChange24h}%`);
      }
    } catch (e) {
      console.warn("[get-iota-tokens] Failed to fetch IOTA price:", e);
    }

    // Transform to standard token format
    let totalValue = 0;
    const tokens = balances.map((coin: any) => {
      const isNativeIota = coin.coinType === "0x2::iota::IOTA";
      const totalBalance = BigInt(coin.totalBalance || "0");
      const decimals = 9;
      const quantity = Number(totalBalance) / Math.pow(10, decimals);
      
      const parts = (coin.coinType || "").split("::");
      const symbol = parts.length > 2 ? parts[parts.length - 1] : (isNativeIota ? "IOTA" : "UNKNOWN");

      const priceUsd = isNativeIota && iotaPriceUsd ? iotaPriceUsd : null;
      const value = priceUsd ? quantity * priceUsd : 0;
      const priceChange24h = isNativeIota && iotaPriceChange24h !== null ? iotaPriceChange24h : 0;
      if (value > 0) totalValue += value;

      return {
        symbol,
        name: isNativeIota ? "IOTA" : symbol,
        quantity,
        decimals,
        coinType: coin.coinType,
        coinObjectCount: coin.coinObjectCount,
        icon: isNativeIota ? "https://d315pvdvxi2gex.cloudfront.net/d96a337f84c5c900f31e08817.svg" : null,
        chain: "iota",
        value,
        priceUsd,
        priceChange24h,
      };
    }).filter((t: any) => t.quantity > 0);

    return new Response(
      JSON.stringify({
        tokens,
        totalValue: totalValue > 0 ? totalValue : null,
        walletAddress,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[get-iota-tokens] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch tokens", tokens: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
