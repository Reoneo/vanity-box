import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, domain } = await req.json();
    const UD_API_KEY = Deno.env.get("UD_API_KEY");
    if (!UD_API_KEY) {
      return new Response(JSON.stringify({ error: "UD_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      Authorization: `Bearer ${UD_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Mode 1: Get comprehensive info for a specific domain
    if (domain) {
      const res = await fetch(
        `https://api.unstoppabledomains.com/resolve/domains/${encodeURIComponent(domain)}`,
        { headers }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[get-ud-domains] Domain lookup failed: ${res.status}`, errText);
        return new Response(JSON.stringify({ error: `UD API error: ${res.status}`, domains: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();
      return new Response(JSON.stringify({ domain: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Reverse resolve - get all domains for a wallet address
    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "walletAddress or domain required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const addr = walletAddress.toLowerCase();

    // Use the UD Resolution reverse lookup
    const reverseRes = await fetch(
      `https://api.unstoppabledomains.com/resolve/reverse/${encodeURIComponent(addr)}`,
      { headers }
    );

    // Also try the partner API for owned domains list
    const ownedRes = await fetch(
      `https://api.unstoppabledomains.com/resolve/owners/${encodeURIComponent(addr)}/domains`,
      { headers }
    );

    let domains: any[] = [];
    let reverseData: any = null;

    if (reverseRes.ok) {
      reverseData = await reverseRes.json();
      console.log("[get-ud-domains] Reverse resolve:", JSON.stringify(reverseData).slice(0, 500));
    } else {
      console.log("[get-ud-domains] Reverse resolve failed:", reverseRes.status);
    }

    if (ownedRes.ok) {
      const ownedData = await ownedRes.json();
      console.log("[get-ud-domains] Owned domains:", JSON.stringify(ownedData).slice(0, 500));
      
      // The owned endpoint returns an array of domain objects
      if (Array.isArray(ownedData)) {
        domains = ownedData;
      } else if (ownedData?.data && Array.isArray(ownedData.data)) {
        domains = ownedData.data;
      }
    } else {
      console.log("[get-ud-domains] Owned domains failed:", ownedRes.status);
      // If owned endpoint fails, try to extract from reverse data
      if (reverseData?.meta?.domain) {
        domains = [{
          name: reverseData.meta.domain,
          records: reverseData.records || {},
          meta: reverseData.meta,
        }];
      }
    }

    // Enrich domains with image/metadata
    const enriched = domains.map((d: any) => ({
      name: d.name || d.domain || d.meta?.domain,
      blockchain: d.meta?.blockchain || d.blockchain || "ETH",
      networkId: d.meta?.networkId || d.networkId,
      owner: d.meta?.owner || d.owner || walletAddress,
      resolver: d.meta?.resolver || d.resolver,
      registry: d.meta?.registry || d.registry,
      records: d.records || {},
      image_url: d.records?.["social.picture.value"] || 
                 d.metadata?.image_url ||
                 `https://resolve.unstoppabledomains.com/image-src/${d.name || d.meta?.domain}`,
      type: "owned",
    }));

    return new Response(JSON.stringify({ domains: enriched, reverse: reverseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[get-ud-domains] Error:", err);
    return new Response(JSON.stringify({ error: String(err), domains: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
