import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const UD_API_KEY = Deno.env.get("UD_API_KEY");
    if (!UD_API_KEY) {
      return new Response(JSON.stringify({ error: "UD_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile (public, no key needed)
    const profileRes = await fetch(
      `https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(domain)}?fields=profile,socialAccounts,social,records`,
    );
    const profileData = profileRes.ok ? await profileRes.json() : null;

    // Fetch NFTs (public)
    const nftRes = await fetch(
      `https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(domain)}/nfts?limit=50&resolve=true`,
    );
    const nftData = nftRes.ok ? await nftRes.json() : null;

    // Fetch domain info (private, requires API key)
    const domainRes = await fetch(
      "https://api.unstoppabledomains.com/mcp/v1/actions/ud_domain_get",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${UD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domains: [domain] }),
      },
    );
    const domainData = domainRes.ok ? await domainRes.json() : null;

    return new Response(
      JSON.stringify({
        profile: profileData,
        nfts: nftData,
        domainInfo: domainData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
