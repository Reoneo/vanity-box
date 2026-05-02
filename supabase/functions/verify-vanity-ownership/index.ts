/**
 * Edge function: verify-vanity-ownership
 * Checks if a given Polygon/EVM address owns any .vanity domains via Unstoppable Domains API.
 * Returns the list of owned .vanity domains.
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

    // Use UD domains endpoint to find domains owned by this wallet
    // The UD Partner API v3 supports listing domains by owner
    const url = `https://api.unstoppabledomains.com/resolve/owners/${encodeURIComponent(walletAddress.toLowerCase())}/domains`;
    console.log(`[verify-vanity] Fetching domains for ${walletAddress} from UD API`);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[verify-vanity] UD HTTP ${res.status}:`, text.slice(0, 300));

      // Fallback: try the profile API which also lists domains
      const fallbackUrl = `https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(walletAddress.toLowerCase())}`;
      console.log(`[verify-vanity] Trying fallback profile API...`);
      
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Accept: "application/json" },
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        // Extract .vanity domains from profile data
        const vanityDomains: string[] = [];
        
        // The profile API may contain domain info
        if (fallbackData?.records || fallbackData?.meta?.domain) {
          const domain = fallbackData?.meta?.domain || "";
          if (domain.endsWith(".vanity")) {
            vanityDomains.push(domain);
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            domains: vanityDomains,
            count: vanityDomains.length,
            source: "profile-fallback",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: false, error: `UD API error: ${res.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    console.log(`[verify-vanity] UD response:`, JSON.stringify(data).slice(0, 500));

    // Filter for .vanity TLD domains
    const allDomains: string[] = [];
    
    // Handle array response (list of domain objects)
    if (Array.isArray(data?.data)) {
      for (const item of data.data) {
        const name = item?.attributes?.meta?.domain || item?.id || "";
        if (typeof name === "string" && name.endsWith(".vanity")) {
          allDomains.push(name);
        }
      }
    } else if (Array.isArray(data)) {
      for (const item of data) {
        const name = typeof item === "string" ? item : item?.name || item?.domain || "";
        if (typeof name === "string" && name.endsWith(".vanity")) {
          allDomains.push(name);
        }
      }
    }

    console.log(`[verify-vanity] Found ${allDomains.length} .vanity domains:`, allDomains);

    return new Response(
      JSON.stringify({
        ok: true,
        domains: allDomains,
        count: allDomains.length,
        source: "ud-api",
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
