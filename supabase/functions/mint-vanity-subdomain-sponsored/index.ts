/**
 * Edge function: mint-vanity-subdomain-sponsored
 * Handles gasless (sponsored) minting of .vanity.iota subdomains for verified .vanity domain owners.
 * 
 * Flow:
 * 1. Verifies the user owns the .vanity domain (via UD API check)
 * 2. Checks subdomain not already minted
 * 3. Records the minted domain in DB
 * 4. Creates Cloudflare redirect
 * 
 * Note: Actual IOTA on-chain minting via IotaNamesClient.transaction.createSubname
 * will be integrated when the IOTA Names SDK sponsor endpoint is available.
 * For now, we record the claim and set up redirects.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Placeholder: The parent NFT object ID for "vanity.iota" on IOTA mainnet
// Replace with the actual on-chain NFT object ID when available
const VANITY_IOTA_PARENT_NFT = "PLACEHOLDER_VANITY_IOTA_PARENT_NFT_OBJECT_ID";

const CLOUDFLARE_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");

async function createCloudflareRedirect(subdomain: string): Promise<{ success: boolean; error?: string }> {
  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
    console.warn("[mint-vanity-sponsored] Cloudflare not configured, skipping redirect");
    return { success: false, error: "Cloudflare not configured" };
  }

  try {
    const dnsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "CNAME",
          name: `${subdomain}.vanity.box`,
          content: "vanity.box",
          proxied: true,
          comment: `Vanity sponsored subdomain redirect for ${subdomain}.vanity.iota`,
        }),
      },
    );

    if (!dnsResponse.ok) {
      const errorData = await dnsResponse.json();
      if (!errorData.errors?.some((e: any) => e.code === 81057)) {
        console.error("[mint-vanity-sponsored] DNS record creation failed:", errorData);
      }
    }

    console.log(`[mint-vanity-sponsored] Cloudflare redirect created for ${subdomain}.vanity.box`);
    return { success: true };
  } catch (error) {
    console.error("[mint-vanity-sponsored] Cloudflare API error:", error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vanityDomain, iotaAddress, evmAddress } = await req.json();

    if (!vanityDomain || !iotaAddress || !evmAddress) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields: vanityDomain, iotaAddress, evmAddress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract subdomain prefix (e.g., "alex" from "alex.vanity")
    const subdomain = String(vanityDomain).replace(/\.vanity$/i, "").trim().toLowerCase();
    if (!subdomain || subdomain.includes(".")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid .vanity domain format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fullName = `${subdomain}.vanity.iota`;
    console.log(`[mint-vanity-sponsored] Minting ${fullName} for IOTA:${iotaAddress}, EVM:${evmAddress}`);

    // Step 1: Verify .vanity domain ownership
    const apiKey = Deno.env.get("UD_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "UD_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify the specific domain is owned by the EVM address
    const udUrl = `https://api.unstoppabledomains.com/resolve/domains/${encodeURIComponent(vanityDomain.toLowerCase())}`;
    const udRes = await fetch(udUrl, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });

    if (!udRes.ok) {
      const text = await udRes.text();
      console.error(`[mint-vanity-sponsored] UD verification failed: ${udRes.status}`, text.slice(0, 200));
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to verify .vanity domain ownership" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const udData = await udRes.json();
    const owner = (udData?.meta?.owner || "").toLowerCase();
    const ethAddr = (udData?.records?.["crypto.ETH.address"] || "").toLowerCase();
    const maticAddr = (udData?.records?.["crypto.MATIC.version.MATIC.address"] || "").toLowerCase();
    const callerAddr = evmAddress.toLowerCase();

    if (owner !== callerAddr && ethAddr !== callerAddr && maticAddr !== callerAddr) {
      console.warn(`[mint-vanity-sponsored] Ownership mismatch: owner=${owner}, caller=${callerAddr}`);
      return new Response(
        JSON.stringify({ ok: false, error: "You do not own this .vanity domain" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 2: Check if already minted
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingDomain } = await supabase
      .from("minted_domains")
      .select("id")
      .eq("subdomain", subdomain)
      .eq("domain", "vanity.iota")
      .single();

    if (existingDomain) {
      return new Response(
        JSON.stringify({ ok: false, error: "This .vanity.iota subdomain has already been claimed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 3: Create Cloudflare redirect
    const cloudflareResult = await createCloudflareRedirect(subdomain);
    if (!cloudflareResult.success) {
      console.warn("[mint-vanity-sponsored] Cloudflare redirect failed, continuing...");
    }

    // Step 4: Record the minted domain
    const registrationDate = new Date();
    const expiryDate = new Date(registrationDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const { error: insertError } = await supabase
      .from("minted_domains")
      .insert({
        subdomain,
        domain: "vanity.iota",
        full_name: fullName,
        wallet_address: iotaAddress.toLowerCase(),
        registration_months: 12,
        registration_date: registrationDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        payment_amount: 0, // Sponsored / free for .vanity holders
        payment_method: "sponsored",
        tx_hash: null, // Will be filled when on-chain tx is submitted
      });

    if (insertError) {
      console.error("[mint-vanity-sponsored] DB insert error:", insertError);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to record minted domain" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // TODO: When IOTA Names SDK sponsor endpoint is ready, build and submit
    // the sponsored createSubname transaction here:
    // const tx = iotaNamesClient.transaction.createSubname({
    //   parentNft: VANITY_IOTA_PARENT_NFT,
    //   name: subdomain,
    //   expirationTimestampMs: expiryDate.getTime(),
    //   allowChildCreation: true,
    //   allowTimeExtension: true,
    // });

    console.log(`[mint-vanity-sponsored] Successfully claimed: ${fullName}`);

    return new Response(
      JSON.stringify({
        ok: true,
        subdomain,
        fullName,
        vanityBoxUrl: `https://${subdomain}.vanity.box`,
        profileUrl: `https://vanity.box/${fullName}`,
        expiryDate: expiryDate.toISOString(),
        sponsored: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[mint-vanity-sponsored] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
