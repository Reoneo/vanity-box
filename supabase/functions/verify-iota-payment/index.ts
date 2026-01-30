// Edge function to verify IOTA payment on-chain
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Payment receiver address for IOTA subdomain purchases
const PAYMENT_RECEIVER_ADDRESS = "0x20ea2665976a7731a1ee82f8d53be43b0f411b231c1c15850b92b8fdbd4b2839";

// IOTA RPC endpoint for mainnet
const IOTA_RPC_ENDPOINT = "https://api.mainnet.iota.cafe";

// Query IOTA transaction by digest
async function getIotaTransaction(txHash: string): Promise<any> {
  const response = await fetch(IOTA_RPC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "iotax_getTransactionBlock",
      params: [txHash, { showInput: true, showEffects: true, showBalanceChanges: true }],
    }),
  });

  if (!response.ok) {
    throw new Error(`IOTA RPC error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "IOTA RPC call failed");
  }

  return data.result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { txHash, reference, walletAddress } = await req.json();

    // Validate required fields
    if (!txHash || !reference || !walletAddress) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: txHash, reference, walletAddress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch payment reference from database
    const { data: paymentRef, error: refError } = await supabase
      .from("payment_references")
      .select("*")
      .eq("reference", reference)
      .single();

    if (refError || !paymentRef) {
      return new Response(
        JSON.stringify({ error: "Payment reference not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already verified
    if (paymentRef.status === "verified") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: true,
          message: "Payment already verified",
          subdomain: paymentRef.subdomain,
          domain: paymentRef.domain
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify wallet address matches
    if (paymentRef.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Wallet address does not match payment reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query the IOTA blockchain for transaction details
    let txData;
    try {
      txData = await getIotaTransaction(txHash);
    } catch (rpcError) {
      console.error("IOTA RPC error:", rpcError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to verify transaction on IOTA network. Transaction may be pending or invalid.",
          verified: false
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if transaction was successful
    if (txData?.effects?.status?.status !== "success") {
      return new Response(
        JSON.stringify({ 
          error: "Transaction was not successful",
          verified: false
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check balance changes to verify payment to receiver address
    const balanceChanges = txData?.balanceChanges || [];
    const receiverPayment = balanceChanges.find(
      (change: any) => 
        change.owner?.AddressOwner?.toLowerCase() === PAYMENT_RECEIVER_ADDRESS.toLowerCase() &&
        BigInt(change.amount || 0) > 0
    );

    if (!receiverPayment) {
      console.log("Balance changes:", JSON.stringify(balanceChanges));
      return new Response(
        JSON.stringify({ 
          error: "Payment to receiver address not found in transaction",
          verified: false
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment reference to verified
    const { error: updateError } = await supabase
      .from("payment_references")
      .update({
        status: "verified",
        tx_hash: txHash,
        verified_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    if (updateError) {
      console.error("Error updating payment reference:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update payment status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Payment verified: ${reference} with tx ${txHash}`);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        message: "Payment verified successfully",
        subdomain: paymentRef.subdomain,
        domain: paymentRef.domain,
        txHash
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
