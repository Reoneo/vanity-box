// Edge function to mint IOTA subdomain after payment verification
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cloudflare API configuration
const CLOUDFLARE_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");

async function createCloudflareRedirect(subdomain: string): Promise<{ success: boolean; error?: string }> {
  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    console.error("Cloudflare credentials not configured");
    return { success: false, error: "Cloudflare not configured" };
  }

  try {
    // Create CNAME record for {subdomain}.vanity.box
    const dnsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "CNAME",
          name: `${subdomain}.vanity.box`,
          content: "vanity.box",
          proxied: true,
          comment: `Vanity IOTA subdomain redirect for ${subdomain}.vanity.iota`,
        }),
      }
    );

    if (!dnsResponse.ok) {
      const errorData = await dnsResponse.json();
      // Ignore if record already exists
      if (!errorData.errors?.some((e: any) => e.code === 81057)) {
        console.error("DNS record creation failed:", errorData);
      }
    }

    // Create redirect rule using Page Rules or Redirect Rules
    const redirectRuleResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rules: [
            {
              expression: `(http.host eq \"${subdomain}.vanity.box\")`,
              action: "redirect",
              action_parameters: {
                from_value: {
                  target_url: {
                    value: `https://vanity.box/${subdomain}.vanity.iota`,
                  },
                  status_code: 301,
                  preserve_query_string: true,
                },
              },
              description: `Redirect ${subdomain}.vanity.box to IOTA profile`,
            },
          ],
        }),
      }
    );

    if (!redirectRuleResponse.ok) {
      const errorData = await redirectRuleResponse.json();
      console.error("Redirect rule creation failed:", errorData);
      // Continue even if redirect rule fails - DNS record is more important
    }

    console.log(`Cloudflare redirect created for ${subdomain}.vanity.box`);
    return { success: true };
  } catch (error) {
    console.error("Cloudflare API error:", error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference, walletAddress } = await req.json();

    // Validate required fields
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

    // Fetch payment reference
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

    // Verify payment is confirmed
    if (paymentRef.status !== "verified") {
      return new Response(
        JSON.stringify({ error: "Payment not yet verified. Please verify payment first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify wallet address matches
    if (paymentRef.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Wallet address does not match payment reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subdomain = paymentRef.subdomain;
    const fullName = `${subdomain}.vanity.iota`;

    // Check if already minted
    const { data: existingDomain } = await supabase
      .from("minted_domains")
      .select("id")
      .eq("subdomain", subdomain)
      .eq("domain", "vanity.iota")
      .single();

    if (existingDomain) {
      return new Response(
        JSON.stringify({ error: "Subdomain already minted" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Cloudflare redirect
    const cloudflareResult = await createCloudflareRedirect(subdomain);
    if (!cloudflareResult.success) {
      console.error("Cloudflare redirect failed, but continuing with mint");
    }

    // Calculate expiry date (1 year from now)
    const registrationDate = new Date();
    const expiryDate = new Date(registrationDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Insert minted domain record
    const { error: insertError } = await supabase
      .from("minted_domains")
      .insert({
        subdomain: subdomain,
        domain: "vanity.iota",
        full_name: fullName,
        wallet_address: walletAddress.toLowerCase(),
        registration_months: 12,
        registration_date: registrationDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        payment_amount: paymentRef.payment_amount,
        payment_method: paymentRef.payment_method,
        tx_hash: paymentRef.tx_hash,
      });

    if (insertError) {
      console.error("Error inserting minted domain:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to record minted domain" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment reference status to completed
    await supabase
      .from("payment_references")
      .update({ status: "completed" })
      .eq("reference", reference);

    console.log(`Successfully minted: ${fullName} for ${walletAddress}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subdomain minted successfully",
        subdomain: subdomain,
        fullName: fullName,
        vanityBoxUrl: `https://${subdomain}.vanity.box`,
        profileUrl: `https://vanity.box/${fullName}`,
        expiryDate: expiryDate.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error minting subdomain:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
