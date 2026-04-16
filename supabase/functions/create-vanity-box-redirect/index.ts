/**
 * Edge function to create vanity.box DNS record and redirect rule via Cloudflare API
 * Called after successful vanity.iota subdomain mint
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateRedirectRequest {
  subdomain: string; // e.g., "tim"
  walletAddress: string;
  txDigest?: string;
}

interface CloudflareResponse {
  success: boolean;
  errors?: { message: string }[];
  result?: { id: string };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, walletAddress, txDigest } = await req.json() as CreateRedirectRequest;

    if (!subdomain || !walletAddress) {
      return new Response(
        JSON.stringify({ error: "Missing subdomain or walletAddress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate subdomain format (3+ chars, alphanumeric + hyphens)
    const cleanSubdomain = subdomain.toLowerCase().trim();
    if (cleanSubdomain.length < 3 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(cleanSubdomain)) {
      return new Response(
        JSON.stringify({ error: "Invalid subdomain format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Cloudflare credentials from secrets
    const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CLOUDFLARE_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");

    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
      console.error("[Cloudflare] Missing API credentials");
      return new Response(
        JSON.stringify({ error: "Cloudflare configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cfHeaders = {
      "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    };

    // Step 1: Create CNAME DNS record for {subdomain}.vanity.box -> vanity.box
    console.log(`[Cloudflare] Creating DNS record for ${cleanSubdomain}.vanity.box`);
    
    const dnsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        method: "POST",
        headers: cfHeaders,
        body: JSON.stringify({
          type: "CNAME",
          name: cleanSubdomain, // subdomain only, CF appends the zone domain
          content: "vanity.box",
          proxied: true, // Must be proxied for redirect rules to work
          comment: `Vanity.iota subdomain: ${cleanSubdomain}.vanity.iota`,
        }),
      }
    );

    const dnsResult = await dnsResponse.json() as CloudflareResponse;
    
    if (!dnsResult.success) {
      // Check if record already exists (duplicate error)
      const isDuplicate = dnsResult.errors?.some(e => 
        e.message.includes("already exists") || e.message.includes("duplicate")
      );
      
      if (!isDuplicate) {
        console.error("[Cloudflare] DNS creation failed:", dnsResult.errors);
        return new Response(
          JSON.stringify({ 
            error: "Failed to create DNS record",
            details: dnsResult.errors 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[Cloudflare] DNS record already exists for ${cleanSubdomain}.vanity.box`);
    } else {
      console.log(`[Cloudflare] DNS record created: ${dnsResult.result?.id}`);
    }

    // Step 1b: Create www CNAME so Total TLS auto-issues cert for www.<name>.vanity.box
    console.log(`[Cloudflare] Creating www CNAME for www.${cleanSubdomain}.vanity.box`);
    const wwwDnsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        method: "POST",
        headers: cfHeaders,
        body: JSON.stringify({
          type: "CNAME",
          name: `www.${cleanSubdomain}`,
          content: "vanity.box",
          proxied: true,
          comment: `WWW redirect for ${cleanSubdomain}.vanity.box`,
        }),
      }
    );
    const wwwDnsResult = await wwwDnsResponse.json() as CloudflareResponse;
    if (wwwDnsResult.success) {
      console.log(`[Cloudflare] www CNAME created for www.${cleanSubdomain}.vanity.box`);
    } else {
      const isDup = wwwDnsResult.errors?.some(e => e.message.includes("already exists"));
      if (isDup) console.log(`[Cloudflare] www CNAME already exists`);
      else console.error(`[Cloudflare] www CNAME error:`, wwwDnsResult.errors);
    }

    // Step 2: Create/update redirect rule via Cloudflare Bulk Redirects
    // We use a Page Rule for simpler setup (redirect rule requires Bulk Redirects API)
    console.log(`[Cloudflare] Creating page rule redirect for ${cleanSubdomain}.vanity.box`);
    
    const pageRuleResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/pagerules`,
      {
        method: "POST",
        headers: cfHeaders,
        body: JSON.stringify({
          targets: [
            {
              target: "url",
              constraint: {
                operator: "matches",
                value: `${cleanSubdomain}.vanity.box/*`,
              },
            },
          ],
          actions: [
            {
              id: "forwarding_url",
              value: {
                url: `https://vanity.box/${cleanSubdomain}.vanity.iota`,
                status_code: 301,
              },
            },
          ],
          priority: 1,
          status: "active",
        }),
      }
    );

    const pageRuleResult = await pageRuleResponse.json() as CloudflareResponse;
    
    if (!pageRuleResult.success) {
      // Check if we hit page rule limit - fallback to just DNS
      const isLimitError = pageRuleResult.errors?.some(e => 
        e.message.includes("limit") || e.message.includes("maximum")
      );
      
      if (isLimitError) {
        console.log("[Cloudflare] Page rule limit reached, DNS record created only");
        // Still return success - DNS was created, redirect won't work via page rule
      } else {
        console.error("[Cloudflare] Page rule creation failed:", pageRuleResult.errors);
        // Don't fail the whole request - DNS was created
      }
    } else {
      console.log(`[Cloudflare] Page rule created: ${pageRuleResult.result?.id}`);
    }

    // Step 3: Store record in Supabase for tracking (optional)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://gdjjboorqviobvvygpca.supabase.co";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase.from("iota_minted_subdomains").insert({
          subdomain: cleanSubdomain,
          full_name: `${cleanSubdomain}.vanity.iota`,
          wallet_address: walletAddress,
          mint_tx_digest: txDigest || null,
          cloudflare_dns_record_id: dnsResult.result?.id || null,
          cloudflare_page_rule_id: pageRuleResult.result?.id || null,
        });
        
        console.log("[Supabase] Minted subdomain record saved");
      }
    } catch (dbError) {
      // Don't fail the request if DB insert fails
      console.error("[Supabase] Failed to save record:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subdomain: cleanSubdomain,
        vanityBoxUrl: `https://${cleanSubdomain}.vanity.box`,
        vanityIotaUrl: `https://vanity.box/${cleanSubdomain}.vanity.iota`,
        dnsRecordId: dnsResult.result?.id,
        pageRuleId: pageRuleResult.result?.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[create-vanity-box-redirect] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
