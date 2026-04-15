const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CF_BASE = "https://api.cloudflare.com/client/v4";

interface DuneRow {
  name?: string;
  domain?: string;
  label?: string;
}

async function fetchDuneResults(apiKey: string): Promise<string[]> {
  const res = await fetch(
    "https://api.dune.com/api/v1/query/7320928/results?limit=1000",
    { headers: { "X-Dune-API-Key": apiKey } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dune API error [${res.status}]: ${text}`);
  }
  const data = await res.json();
  const rows: DuneRow[] = data?.result?.rows ?? [];
  return rows
    .map((r) => {
      const raw = r.name || r.domain || r.label || "";
      return raw.replace(/\.vanity$/i, "").trim().toLowerCase();
    })
    .filter((d) => d.length > 0);
}

async function listExistingRecords(
  token: string,
  zoneId: string
): Promise<Set<string>> {
  const existing = new Set<string>();
  let page = 1;
  while (true) {
    const res = await fetch(
      `${CF_BASE}/zones/${zoneId}/dns_records?per_page=100&page=${page}&type=CNAME`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloudflare list error [${res.status}]: ${text}`);
    }
    const json = await res.json();
    const records = json.result ?? [];
    for (const rec of records) {
      const match = rec.name?.match(/^www\.(.+)\.vanity\.box$/i);
      if (match) existing.add(match[1].toLowerCase());
    }
    const totalPages = json.result_info?.total_pages ?? 1;
    if (page >= totalPages) break;
    page++;
  }
  return existing;
}

async function createCNAME(
  token: string,
  zoneId: string,
  domain: string
): Promise<{ domain: string; success: boolean; error?: string }> {
  const res = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "CNAME",
      name: `www.${domain}.vanity.box`,
      content: "ud.me",
      ttl: 3600,
      proxied: true,
    }),
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "60", 10);
    return { domain, success: false, error: `rate-limited, retry after ${retryAfter}s` };
  }

  const json = await res.json();
  if (!json.success) {
    const errMsg = json.errors?.map((e: any) => e.message).join("; ") ?? "unknown";
    return { domain, success: false, error: errMsg };
  }
  return { domain, success: true };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const DUNE_API_KEY = Deno.env.get("DUNE_API_KEY");
    if (!DUNE_API_KEY) throw new Error("DUNE_API_KEY not configured");

    const CF_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    if (!CF_API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN not configured");

    const ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!ZONE_ID) throw new Error("CLOUDFLARE_ZONE_ID not configured");

    // Optional: only sync a single domain (for search-triggered use)
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const singleDomain = body?.domain?.replace(/\.vanity$/i, "").trim().toLowerCase();

    // 1. Fetch domains from Dune
    const allDomains = await fetchDuneResults(DUNE_API_KEY);

    // 2. If single domain requested, check it exists in Dune
    const domainsToProcess = singleDomain
      ? allDomains.filter((d) => d === singleDomain)
      : allDomains;

    if (singleDomain && domainsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ error: "Domain not found in purchased .vanity list", found: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check existing DNS records
    const existing = await listExistingRecords(CF_API_TOKEN, ZONE_ID);

    // 4. Filter to only new domains
    const missing = domainsToProcess.filter((d) => !existing.has(d));

    if (missing.length === 0) {
      return new Response(
        JSON.stringify({
          message: "All domains already configured",
          total: domainsToProcess.length,
          existing: domainsToProcess.length,
          created: 0,
          found: singleDomain ? true : undefined,
          redirectUrl: singleDomain ? `https://ud.me/${singleDomain}.vanity` : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create records with rate limiting (batch of 20, 2s delay)
    const results: Array<{ domain: string; success: boolean; error?: string }> = [];
    for (let i = 0; i < missing.length; i++) {
      const result = await createCNAME(CF_API_TOKEN, ZONE_ID, missing[i]);
      results.push(result);

      if (result.error?.includes("rate-limited")) {
        await sleep(60_000);
        // Retry once
        const retry = await createCNAME(CF_API_TOKEN, ZONE_ID, missing[i]);
        results[results.length - 1] = retry;
      }

      // Throttle: pause every 20 records
      if ((i + 1) % 20 === 0) await sleep(2000);
    }

    const created = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    return new Response(
      JSON.stringify({
        total: domainsToProcess.length,
        existing: domainsToProcess.length - missing.length,
        created,
        failed: failed.length,
        failures: failed.length > 0 ? failed : undefined,
        found: singleDomain ? true : undefined,
        redirectUrl: singleDomain ? `https://ud.me/${singleDomain}.vanity` : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("sync-vanity-dns error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
