/**
 * Edge function: verify-vanity-ownership
 * Checks if a given Polygon/EVM address owns any .vanity domains via
 * Unstoppable Domains reverse resolution on Polygon.
 * 
 * Uses the UD Resolution API to reverse-resolve domains for a wallet address,
 * then filters for .vanity TLD.
 * 
 * Reference: https://docs.unstoppabledomains.com/web3/smart-contracts/quick-start/reverse-resolve-domains
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing walletAddress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("UD_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "UD_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const addr = walletAddress.toLowerCase();
    console.log(`[verify-vanity] Reverse-resolving domains for ${addr}`);

    // Method 1: UD Resolution API — reverse resolution endpoint
    const reverseUrl = `https://api.unstoppabledomains.com/resolve/reverse/${encodeURIComponent(addr)}`;
    let vanityDomains: string[] = [];

    const reverseRes = await fetch(reverseUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (reverseRes.ok) {
      const reverseData = await reverseRes.json();
      console.log(`[verify-vanity] Reverse response:`, JSON.stringify(reverseData).slice(0, 500));

      // The reverse endpoint may return a single domain or meta.domain
      const domain = reverseData?.meta?.domain || reverseData?.domain || "";
      if (typeof domain === "string" && domain.endsWith(".vanity")) {
        vanityDomains.push(domain);
      }
    }

    // Method 2: UD Domains-by-owner endpoint for comprehensive listing
    const ownerUrl = `https://api.unstoppabledomains.com/resolve/owners/${encodeURIComponent(addr)}/domains`;
    const ownerRes = await fetch(ownerUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (ownerRes.ok) {
      const ownerData = await ownerRes.json();
      console.log(`[verify-vanity] Owner domains response:`, JSON.stringify(ownerData).slice(0, 500));

      // Parse array of domain objects
      const items = Array.isArray(ownerData?.data) ? ownerData.data : Array.isArray(ownerData) ? ownerData : [];
      for (const item of items) {
        const name = item?.attributes?.meta?.domain || item?.meta?.domain || item?.id || item?.name || item?.domain || "";
        if (typeof name === "string" && name.endsWith(".vanity") && !vanityDomains.includes(name)) {
          vanityDomains.push(name);
        }
      }
    } else {
      console.warn(`[verify-vanity] Owner endpoint returned ${ownerRes.status}`);
    }

    // Method 3: Profile API fallback
    if (vanityDomains.length === 0) {
      const profileUrl = `https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(addr)}`;
      const profileRes = await fetch(profileUrl, {
        headers: { Accept: "application/json" },
      });

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const domain = profileData?.meta?.domain || "";
        if (typeof domain === "string" && domain.endsWith(".vanity")) {
          vanityDomains.push(domain);
        }
      }
    }

    console.log(`[verify-vanity] Found ${vanityDomains.length} .vanity domains:`, vanityDomains);

    return new Response(
      JSON.stringify({
        ok: true,
        domains: vanityDomains,
        count: vanityDomains.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[verify-vanity] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
