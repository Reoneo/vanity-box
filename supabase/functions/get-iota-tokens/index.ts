// Edge function to fetch IOTA tokens/coins via Blockberry API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKBERRY_API_URL = "https://api.blockberry.one/iota";

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

    const apiKey = Deno.env.get("BLOCKBERRY_API_KEY");
    if (!apiKey) {
      console.error("BLOCKBERRY_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API not configured", tokens: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-iota-tokens] Fetching tokens for ${walletAddress}`);

    // Fetch account coins from Blockberry
    const url = `${BLOCKBERRY_API_URL}/v1/accounts/${walletAddress}/coins?size=100`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Blockberry coins API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, tokens: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const coins = data?.content || data || [];
    
    console.log(`[get-iota-tokens] Found ${Array.isArray(coins) ? coins.length : 0} coin types`);

    // Transform to standard token format
    const tokens = (Array.isArray(coins) ? coins : []).map((coin: any) => {
      const isNativeIota = coin.coinType === "0x2::iota::IOTA" || coin.symbol === "IOTA";
      const decimals = coin.decimals || 9;
      const balance = parseFloat(coin.balance || coin.amount || "0");
      const quantity = balance / Math.pow(10, decimals);
      
      return {
        symbol: coin.symbol || (isNativeIota ? "IOTA" : "UNKNOWN"),
        name: coin.name || coin.symbol || (isNativeIota ? "IOTA" : "Unknown Token"),
        quantity: quantity,
        decimals: decimals,
        coinType: coin.coinType || coin.type,
        icon: coin.iconUrl || coin.logoUrl || (isNativeIota ? "https://assets.coingecko.com/coins/images/34421/standard/IOTA_Logo_icon_black_circle.png" : null),
        chain: "iota",
        usdValue: coin.usdValue || null,
        priceUsd: coin.priceUsd || null,
      };
    }).filter((t: any) => t.quantity > 0);

    // Calculate total USD value if available
    const totalValue = tokens.reduce((sum: number, t: any) => {
      if (t.usdValue) return sum + parseFloat(t.usdValue);
      if (t.priceUsd && t.quantity) return sum + (t.priceUsd * t.quantity);
      return sum;
    }, 0);

    return new Response(
      JSON.stringify({
        tokens,
        totalValue,
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
