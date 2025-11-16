// Edge function to get Aptos wallet balance for APT and USDC tokens
import { Aptos, AptosConfig, Network } from "npm:@aptos-labs/ts-sdk@^1.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BalanceRequest {
  address: string;
}

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

    // Initialize Aptos client
    const config = new AptosConfig({ network: Network.MAINNET });
    const aptos = new Aptos(config);

    try {
      // Get APT balance
      const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
      const COIN_STORE = `0x1::coin::CoinStore<${APTOS_COIN}>`;
      
      let aptBalance = 0;
      try {
        const aptResource = await aptos.getAccountResource({
          accountAddress: address,
          resourceType: COIN_STORE,
        });
        aptBalance = Number(aptResource.coin.value) / 100_000_000; // Convert from Octas (8 decimals)
      } catch (aptError) {
        console.log("[get-aptos-balance] APT resource not found, balance = 0");
      }

      // Get USDC balance
      const USDC_ADDRESS = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
      const USDC_STORE = `0x1::coin::CoinStore<${USDC_ADDRESS}>`;
      
      let usdcBalance = 0;
      try {
        const usdcResource = await aptos.getAccountResource({
          accountAddress: address,
          resourceType: USDC_STORE,
        });
        usdcBalance = Number(usdcResource.coin.value) / 1_000_000; // Convert from micro-USDC (6 decimals)
      } catch (usdcError) {
        console.log("[get-aptos-balance] USDC resource not found, balance = 0");
      }

      console.log(`[get-aptos-balance] APT: ${aptBalance}, USDC: ${usdcBalance}`);

      return new Response(
        JSON.stringify({
          success: true,
          aptBalance,
          usdcBalance,
          address,
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
          error: "Failed to fetch balance from Aptos network",
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("[get-aptos-balance] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get balance" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});