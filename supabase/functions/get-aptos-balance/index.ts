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
      // Get APT balance using the SDK's built-in method
      let aptBalance = 0;
      try {
        const balance = await aptos.getAccountAPTAmount({
          accountAddress: address,
        });
        aptBalance = balance / 100_000_000; // Convert from Octas (8 decimals)
        console.log(`[get-aptos-balance] APT balance fetched: ${aptBalance}`);
      } catch (aptError: any) {
        console.log(`[get-aptos-balance] APT balance fetch error: ${aptError.message}`);
      }

      // Get USDC balance
      const USDC_ADDRESS = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
      
      let usdcBalance = 0;
      try {
        const balance = await aptos.getAccountCoinAmount({
          accountAddress: address,
          coinType: USDC_ADDRESS,
        });
        usdcBalance = balance / 1_000_000; // Convert from micro-USDC (6 decimals)
        console.log(`[get-aptos-balance] USDC balance fetched: ${usdcBalance}`);
      } catch (usdcError: any) {
        console.log(`[get-aptos-balance] USDC balance fetch error: ${usdcError.message}`);
      }

      console.log(`[get-aptos-balance] Final - APT: ${aptBalance}, USDC: ${usdcBalance}`);

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