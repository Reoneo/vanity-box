// Edge function to get Aptos wallet balance for APT and USDC tokens using REST API
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BalanceRequest {
  address: string;
}

const APTOS_MAINNET_URL = "https://fullnode.mainnet.aptoslabs.com/v1";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { address }: BalanceRequest = await req.json();

    console.log(`[get-aptos-balance] Fetching balance for: ${address}`);

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize address (ensure 0x prefix)
    const normalizedAddress = address.startsWith("0x") ? address : `0x${address}`;

    try {
      // Define CoinStore types
      const APT_COIN_STORE = "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>";
      const USDC_COIN_STORE = "0x1::coin::CoinStore<0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC>";

      // Fetch both balances in parallel
      const [aptResponse, usdcResponse] = await Promise.all([
        fetch(`${APTOS_MAINNET_URL}/accounts/${normalizedAddress}/resource/${encodeURIComponent(APT_COIN_STORE)}`),
        fetch(`${APTOS_MAINNET_URL}/accounts/${normalizedAddress}/resource/${encodeURIComponent(USDC_COIN_STORE)}`)
      ]);

      let aptBalance = 0;
      if (aptResponse.ok) {
        const aptData = await aptResponse.json();
        const aptValue = BigInt(aptData?.data?.coin?.value || "0");
        aptBalance = Number(aptValue) / 100_000_000; // 8 decimals
        console.log(`[get-aptos-balance] APT balance fetched: ${aptBalance}`);
      } else if (aptResponse.status === 404) {
        console.log("[get-aptos-balance] APT CoinStore not found, balance = 0");
      } else {
        console.log(`[get-aptos-balance] APT fetch error: ${aptResponse.status}`);
      }

      let usdcBalance = 0;
      if (usdcResponse.ok) {
        const usdcData = await usdcResponse.json();
        const usdcValue = BigInt(usdcData?.data?.coin?.value || "0");
        usdcBalance = Number(usdcValue) / 1_000_000; // 6 decimals
        console.log(`[get-aptos-balance] USDC balance fetched: ${usdcBalance}`);
      } else if (usdcResponse.status === 404) {
        console.log("[get-aptos-balance] USDC CoinStore not found, balance = 0");
      } else {
        console.log(`[get-aptos-balance] USDC fetch error: ${usdcResponse.status}`);
      }

      console.log(`[get-aptos-balance] Final - APT: ${aptBalance}, USDC: ${usdcBalance}`);

      return new Response(
        JSON.stringify({
          success: true,
          aptBalance,
          usdcBalance,
          address: normalizedAddress,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );

    } catch (error: any) {
      console.error("[get-aptos-balance] Aptos API error:", error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Failed to fetch balance from Aptos network",
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("[get-aptos-balance] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to get balance" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});