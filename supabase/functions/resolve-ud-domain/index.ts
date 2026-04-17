// Resolve any Unstoppable Domains name (including unclaimed) using the UD Partner API.
// Public CORS, no JWT required.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let domain = url.searchParams.get("domain") || "";

    if (!domain && req.method === "POST") {
      try {
        const body = await req.json();
        domain = String(body?.domain || "");
      } catch (_) {}
    }

    domain = String(domain || "").trim().toLowerCase();
    if (!domain || !domain.includes(".")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing or invalid domain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("UD_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "UD_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // UD authoritative resolution endpoint
    const udUrl = `https://api.unstoppabledomains.com/resolve/domains/${encodeURIComponent(domain)}`;
    const res = await fetch(udUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (res.status === 404) {
      return new Response(
        JSON.stringify({ ok: false, notFound: true, domain }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`[resolve-ud-domain] UD HTTP ${res.status}:`, text);
      return new Response(
        JSON.stringify({ ok: false, error: `UD HTTP ${res.status}`, details: text.slice(0, 300) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const records = data?.records || {};
    const meta = data?.meta || {};

    const ethAddress =
      records["crypto.ETH.address"] ||
      records["token.EVM.ETH.ETH.address"] ||
      records["token.EVM.address"] ||
      "";
    const maticAddress =
      records["crypto.MATIC.version.MATIC.address"] ||
      records["crypto.MATIC.version.ERC20.address"] ||
      records["token.EVM.MATIC.MATIC.address"] ||
      "";
    const owner = meta?.owner || "";

    const address = ethAddress || maticAddress || owner || null;

    // Map text records into social links
    const links: Record<string, { link: string; handle: string }> = {};
    const addLink = (platform: string, handle: string | undefined, builder: (h: string) => string) => {
      if (handle && typeof handle === "string" && handle.trim()) {
        const h = handle.trim();
        links[platform] = { link: builder(h), handle: h };
      }
    };
    addLink("twitter", records["social.twitter.username"], (h) => `https://twitter.com/${h.replace(/^@/, "")}`);
    addLink("github", records["social.github.username"], (h) => `https://github.com/${h.replace(/^@/, "")}`);
    addLink("telegram", records["social.telegram.username"], (h) => `https://t.me/${h.replace(/^@/, "")}`);
    addLink("discord", records["social.discord.username"], (h) => h);
    addLink("reddit", records["social.reddit.username"], (h) => `https://reddit.com/user/${h.replace(/^@/, "")}`);
    addLink("linkedin", records["social.linkedin.username"], (h) => h.startsWith("http") ? h : `https://linkedin.com/in/${h}`);
    addLink("youtube", records["social.youtube.channel"], (h) => h.startsWith("http") ? h : `https://youtube.com/@${h.replace(/^@/, "")}`);

    const avatar = records["social.picture.value"] || records["ipfs.html.value"] ? null : null;
    const description = records["profile.description"] || null;
    const website = records["whois.website.value"] || records["profile.web2Url"] || null;

    const profile = {
      address,
      identity: domain,
      platform: "unstoppabledomains",
      displayName: records["profile.displayName"] || domain,
      avatar,
      description,
      header: null,
      website,
      url: website,
      links,
      location: records["profile.location"] || null,
      email: records["whois.email.value"] || null,
    };

    return new Response(
      JSON.stringify({ ok: true, profile, raw: { meta, recordsCount: Object.keys(records).length } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[resolve-ud-domain] error:", err?.message || err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
