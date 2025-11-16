// Deno edge function to mint .apt subdomains using Aptos SDK
import { Aptos, AptosConfig, Network } from "npm:@aptos-labs/ts-sdk@^1.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MintRequest {
  subdomain: string;
  walletAddress: string;
  domain: string;
  registrationMonths: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subdomain, walletAddress, domain, registrationMonths }: MintRequest = await req.json();

    console.log(`[mint-apt-subdomain] Request:`, { subdomain, walletAddress, domain, registrationMonths });

    // Validate input
    if (!subdomain || !walletAddress || !domain) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Aptos client (mainnet for production, testnet for dev)
    const config = new AptosConfig({ network: Network.MAINNET });
    const aptos = new Aptos(config);

    // For now, we'll return a success response with instructions
    // In production, you would:
    // 1. Create a transaction to register the subdomain
    // 2. Return the transaction for the user to sign
    // 3. Submit the signed transaction
    
    const fullName = `${subdomain}.${domain}`;
    
    console.log(`[mint-apt-subdomain] Would mint: ${fullName} for ${walletAddress}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Aptos subdomain minting prepared",
        fullName,
        walletAddress,
        registrationMonths,
        // In production, include transaction details here
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[mint-apt-subdomain] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to mint subdomain" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
