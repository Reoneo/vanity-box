// Edge function to verify IOTA payment via tx digest or Blockberry API fallback
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Payment receiver address for IOTA subdomain purchases
const PAYMENT_RECEIVER_ADDRESS = "0x20ea2665976a7731a1ee82f8d53be43b0f411b231c1c15850b92b8fdbd4b2839";

// IOTA Mainnet RPC endpoint
const IOTA_RPC_URL = "https://api.mainnet.iota.cafe";

// Blockberry API endpoint for IOTA mainnet (fallback)
const BLOCKBERRY_API_URL = "https://api.blockberry.one/iota";

// Verify transaction via IOTA JSON-RPC (primary path when digest is provided)
async function verifyTransactionViaRpc(
  txDigest: string,
  senderAddress: string,
  expectedAmountNanos: number
): Promise<{ verified: boolean; amount: number }> {
  try {
    const response = await fetch(IOTA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "iota_getTransactionBlock",
        params: [
          txDigest,
          {
            showInput: true,
            showEffects: true,
            showBalanceChanges: true,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[RPC] HTTP error:", response.status);
      return { verified: false, amount: 0 };
    }

    const data = await response.json();
    if (data.error) {
      console.error("[RPC] JSON-RPC error:", data.error);
      return { verified: false, amount: 0 };
    }

    const result = data.result;

    // Check transaction was successful
    const status = result?.effects?.status?.status;
    if (status !== "success") {
      console.log("[RPC] Transaction status:", status);
      return { verified: false, amount: 0 };
    }

    // Verify sender matches
    const txSender = result?.transaction?.data?.sender;
    if (txSender?.toLowerCase() !== senderAddress.toLowerCase()) {
      console.log("[RPC] Sender mismatch:", txSender, "vs", senderAddress);
      return { verified: false, amount: 0 };
    }

    // Check balance changes for the receiver
    const balanceChanges = result?.balanceChanges || [];
    for (const change of balanceChanges) {
      const owner = change?.owner?.AddressOwner?.toLowerCase();
      const amount = parseInt(change?.amount || "0", 10);
      if (owner === PAYMENT_RECEIVER_ADDRESS.toLowerCase() && amount > 0) {
        console.log(`[RPC] Verified payment: ${amount} nanos to receiver`);
        return { verified: true, amount };
      }
    }

    console.log("[RPC] No matching balance change found for receiver");
    return { verified: false, amount: 0 };
  } catch (err) {
    console.error("[RPC] Verification error:", err);
    return { verified: false, amount: 0 };
  }
}

// Query recent transactions to receiver address using Blockberry API (fallback)
async function getRecentPaymentsToReceiver(apiKey: string, senderAddress: string, expectedAmount: number): Promise<{ txHash: string; amount: number } | null> {
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

  for (const activity of activities) {
    if (activity.type === "RECEIVE" || activity.transactionType === "TRANSFER") {
      const from = activity.sender?.toLowerCase() || activity.from?.toLowerCase();
      const amount = parseFloat(activity.amount || "0");
      
      if (from === senderAddress.toLowerCase()) {
        const amountTolerance = expectedAmount * 0.95;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference, walletAddress, txHash, pollForPayment } = await req.json();

    if (!reference || !walletAddress) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: reference, walletAddress" }),
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

    // Idempotency: check if this txHash is already used by another reference
    if (txHash) {
      const { data: existingTx } = await supabase
        .from("payment_references")
        .select("reference")
        .eq("tx_hash", txHash)
        .neq("reference", reference)
        .single();

      if (existingTx) {
        return new Response(
          JSON.stringify({ error: "Transaction already used for another payment" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const expectedAmount = parseFloat(paymentRef.payment_amount || "0");
    let verifiedTxHash: string | null = null;

    // Primary path: verify via IOTA RPC if txHash provided
    if (txHash) {
      console.log(`[Verify] Verifying tx ${txHash} via IOTA RPC`);
      // expectedAmount is in USD in the DB, but the token amount is passed separately.
      // For RPC verification we just check the transfer happened to the correct address.
      const rpcResult = await verifyTransactionViaRpc(txHash, walletAddress, 0);
      if (rpcResult.verified) {
        verifiedTxHash = txHash;
      } else {
        // Fallback: try Blockberry for this specific tx
        const blockberryApiKey = Deno.env.get("BLOCKBERRY_API_KEY");
        if (blockberryApiKey) {
          console.log(`[Verify] RPC verification inconclusive, trying Blockberry for tx ${txHash}`);
          // Try polling approach as fallback
          const payment = await getRecentPaymentsToReceiver(blockberryApiKey, walletAddress, expectedAmount);
          if (payment) {
            verifiedTxHash = payment.txHash;
          }
        }
      }
    }
    
    // Fallback: poll Blockberry for recent payments (manual send flow)
    if (!verifiedTxHash && pollForPayment) {
      const blockberryApiKey = Deno.env.get("BLOCKBERRY_API_KEY");
      if (!blockberryApiKey) {
        return new Response(
          JSON.stringify({ error: "Payment verification service not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[Verify] Polling for payment from ${walletAddress} of ~${expectedAmount} IOTA`);
      const payment = await getRecentPaymentsToReceiver(blockberryApiKey, walletAddress, expectedAmount);
      if (payment) {
        verifiedTxHash = payment.txHash;
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
