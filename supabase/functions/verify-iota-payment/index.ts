// Edge function to verify IOTA payment using Blockberry API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Payment receiver address for IOTA subdomain purchases
const PAYMENT_RECEIVER_ADDRESS = "0x20ea2665976a7731a1ee82f8d53be43b0f411b231c1c15850b92b8fdbd4b2839";

// Blockberry API endpoint for IOTA mainnet
const BLOCKBERRY_API_URL = "https://api.blockberry.one/iota";

// Query recent transactions to receiver address using Blockberry API
async function getRecentPaymentsToReceiver(apiKey: string, senderAddress: string, expectedAmount: number): Promise<{ txHash: string; amount: number } | null> {
  // Query transactions received by the payment address
  const url = `${BLOCKBERRY_API_URL}/v1/accounts/${PAYMENT_RECEIVER_ADDRESS}/activities?size=50&orderBy=DESC`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: { 
      "Accept": "application/json",
      "x-api-key": apiKey 
    },
  });

  if (!response.ok) {
    console.error("Blockberry API error:", response.status, await response.text());
    throw new Error(`Blockberry API error: ${response.status}`);
  }

  const data = await response.json();
  const activities = data?.content || [];

  console.log(`[Blockberry] Checking ${activities.length} recent activities for payment from ${senderAddress}`);

  // Look for a matching payment from the sender
  for (const activity of activities) {
    // Check if this is an incoming transfer
    if (activity.type === "RECEIVE" || activity.transactionType === "TRANSFER") {
      const from = activity.sender?.toLowerCase() || activity.from?.toLowerCase();
      const amount = parseFloat(activity.amount || "0");
      
      // Match sender and check amount is close enough (within 5% tolerance for gas)
      if (from === senderAddress.toLowerCase()) {
        const amountTolerance = expectedAmount * 0.95; // Allow 5% less for gas
        if (amount >= amountTolerance) {
          console.log(`[Blockberry] Found matching payment: ${activity.digest || activity.txHash} for ${amount}`);
          return {
            txHash: activity.digest || activity.txHash || activity.transactionHash,
            amount: amount,
          };
        }
      }
    }
  }

  return null;
}

// Verify a specific transaction hash using Blockberry
async function verifyTransactionHash(apiKey: string, txHash: string, senderAddress: string): Promise<{ verified: boolean; amount: number }> {
  const url = `${BLOCKBERRY_API_URL}/v1/transactions/${txHash}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: { 
      "Accept": "application/json",
      "x-api-key": apiKey 
    },
  });

  if (!response.ok) {
    console.error("Blockberry tx lookup error:", response.status);
    return { verified: false, amount: 0 };
  }

  const txData = await response.json();
  
  // Check if transaction was successful and sent to our receiver
  if (txData.status === "success" || txData.status === "SUCCESS") {
    const balanceChanges = txData.balanceChanges || txData.objectChanges || [];
    
    // Look for payment to receiver address
    for (const change of balanceChanges) {
      const recipient = change.recipient?.toLowerCase() || change.owner?.toLowerCase();
      if (recipient === PAYMENT_RECEIVER_ADDRESS.toLowerCase() && parseFloat(change.amount || "0") > 0) {
        return { verified: true, amount: parseFloat(change.amount) };
      }
    }
  }

  return { verified: false, amount: 0 };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference, walletAddress, txHash, pollForPayment } = await req.json();

    // Validate required fields
    if (!reference || !walletAddress) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: reference, walletAddress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Blockberry API key
    const blockberryApiKey = Deno.env.get("BLOCKBERRY_API_KEY");
    if (!blockberryApiKey) {
      console.error("BLOCKBERRY_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment verification service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          domain: paymentRef.domain,
          txHash: paymentRef.tx_hash
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

    // Expected amount in IOTA tokens
    const expectedAmount = parseFloat(paymentRef.payment_amount || "0");
    let verifiedTxHash: string | null = null;
    let verifiedAmount: number = 0;

    // If txHash provided, verify it directly
    if (txHash) {
      const result = await verifyTransactionHash(blockberryApiKey, txHash, walletAddress);
      if (result.verified) {
        verifiedTxHash = txHash;
        verifiedAmount = result.amount;
      }
    }
    
    // If no txHash or verification failed, poll for recent payments
    if (!verifiedTxHash && pollForPayment) {
      console.log(`[Verify] Polling for payment from ${walletAddress} of ~${expectedAmount} IOTA`);
      const payment = await getRecentPaymentsToReceiver(blockberryApiKey, walletAddress, expectedAmount);
      if (payment) {
        verifiedTxHash = payment.txHash;
        verifiedAmount = payment.amount;
      }
    }

    // If no payment found
    if (!verifiedTxHash) {
      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          message: "Payment not found yet. Please wait a moment and try again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment reference to verified
    const { error: updateError } = await supabase
      .from("payment_references")
      .update({
        status: "verified",
        tx_hash: verifiedTxHash,
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

    console.log(`[Verify] Payment verified: ${reference} with tx ${verifiedTxHash}`);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        message: "Payment verified successfully",
        subdomain: paymentRef.subdomain,
        domain: paymentRef.domain,
        txHash: verifiedTxHash
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
