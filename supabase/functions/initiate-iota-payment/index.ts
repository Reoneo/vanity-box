// Edge function to initiate IOTA subdomain payment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Payment receiver address for IOTA subdomain purchases
const PAYMENT_RECEIVER_ADDRESS = "0x20ea2665976a7731a1ee82f8d53be43b0f411b231c1c15850b92b8fdbd4b2839";

// Generate unique payment reference
function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `IOTA-${timestamp}-${random}`.toUpperCase();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, walletAddress, paymentAmountUsd, paymentMethod, tokenAmount } = await req.json();

    // Validate required fields
    if (!subdomain || !walletAddress || !paymentAmountUsd || !paymentMethod || !tokenAmount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate subdomain length (minimum 3 characters)
    if (subdomain.length < 3) {
      return new Response(
        JSON.stringify({ error: "Subdomain must be at least 3 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate payment method
    if (!["IOTA", "ETH"].includes(paymentMethod.toUpperCase())) {
      return new Response(
        JSON.stringify({ error: "Invalid payment method. Use IOTA or ETH." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if subdomain is already minted
    const { data: existingDomain } = await supabase
      .from("minted_domains")
      .select("id")
      .eq("subdomain", subdomain.toLowerCase())
      .eq("domain", "vanity.iota")
      .single();

    if (existingDomain) {
      return new Response(
        JSON.stringify({ error: "Subdomain already registered" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for pending payment for this subdomain
    const { data: pendingPayment } = await supabase
      .from("payment_references")
      .select("id, reference")
      .eq("subdomain", subdomain.toLowerCase())
      .eq("domain", "vanity.iota")
      .eq("status", "pending")
      .single();

    // If there's already a pending payment, return that reference
    if (pendingPayment) {
      return new Response(
        JSON.stringify({
          success: true,
          reference: pendingPayment.reference,
          paymentAddress: PAYMENT_RECEIVER_ADDRESS,
          tokenAmount: tokenAmount,
          paymentMethod: paymentMethod.toUpperCase(),
          subdomain: subdomain.toLowerCase(),
          message: "Existing pending payment found"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new payment reference
    const reference = generatePaymentReference();

    // Insert payment reference into database
    const { error: insertError } = await supabase
      .from("payment_references")
      .insert({
        reference,
        subdomain: subdomain.toLowerCase(),
        domain: "vanity.iota",
        wallet_address: walletAddress.toLowerCase(),
        payment_amount: paymentAmountUsd,
        payment_method: paymentMethod.toUpperCase(),
        status: "pending",
      });

    if (insertError) {
      console.error("Error inserting payment reference:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create payment reference" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Payment initiated: ${reference} for ${subdomain}.vanity.iota`);

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        paymentAddress: PAYMENT_RECEIVER_ADDRESS,
        tokenAmount: tokenAmount,
        paymentMethod: paymentMethod.toUpperCase(),
        subdomain: subdomain.toLowerCase(),
        message: "Payment reference created. Send payment to the specified address."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error initiating payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
