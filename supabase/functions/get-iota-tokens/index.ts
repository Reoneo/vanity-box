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

    // Transform to standard token format
    const tokens = balances.map((coin: any) => {
      const isNativeIota = coin.coinType === "0x2::iota::IOTA";
      const totalBalance = BigInt(coin.totalBalance || "0");
      const decimals = 9; // IOTA uses 9 decimals
      const quantity = Number(totalBalance) / Math.pow(10, decimals);
      
      // Extract symbol from coinType (e.g., "0x2::iota::IOTA" -> "IOTA")
      const parts = (coin.coinType || "").split("::");
      const symbol = parts.length > 2 ? parts[parts.length - 1] : (isNativeIota ? "IOTA" : "UNKNOWN");
      
      return {
        symbol: symbol,
        name: isNativeIota ? "IOTA" : symbol,
        quantity: quantity,
        decimals: decimals,
        coinType: coin.coinType,
        coinObjectCount: coin.coinObjectCount,
        icon: isNativeIota ? "https://assets.coingecko.com/coins/images/34421/standard/IOTA_Logo_icon_black_circle.png" : null,
        chain: "iota",
        usdValue: null,
        priceUsd: null,
      };
    }).filter((t: any) => t.quantity > 0);

    return new Response(
      JSON.stringify({
        tokens,
        totalValue: null, // Would need price API for USD values
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
