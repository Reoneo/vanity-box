const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CF_BASE = "https://api.cloudflare.com/client/v4";

/** Fetch all .vanity domains from Dune query 7320928 */
async function fetchDuneResults(apiKey: string): Promise<string[]> {
  const allRows: any[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(
      `https://api.dune.com/api/v1/query/7320928/results?limit=${limit}&offset=${offset}`,
      { headers: { "X-Dune-API-Key": apiKey } }
    );
    if (!res.ok) throw new Error(`Dune API error [${res.status}]: ${await res.text()}`);
    const data = await res.json();
    const rows = data?.result?.rows ?? [];
    console.log(`Dune offset=${offset}: ${rows.length} rows`);
    allRows.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
  }
  console.log(`Dune total: ${allRows.length}`);
  if (allRows.length > 0) console.log("Sample row:", JSON.stringify(allRows[0]));

  // Column is "domain" with values like "afrobeat.vanity"
  return allRows
    .map((r) => {
      const raw = String(r.domain || r.name || "");
      return raw.replace(/\.vanity$/i, "").trim().toLowerCase();
    })
    .filter((d) => d.length > 0);
}

/** List existing DNS A records under *.vanity.box */
async function listExistingRecords(token: string, zoneId: string): Promise<Map<string, string>> {
  const existing = new Map<string, string>(); // name -> record_id
  let page = 1;
  while (true) {
    const res = await fetch(
      `${CF_BASE}/zones/${zoneId}/dns_records?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) throw new Error(`CF list error [${res.status}]: ${await res.text()}`);
    const json = await res.json();
    for (const rec of json.result ?? []) {
      // Match records like "afrobeat.vanity.box"
      const m = rec.name?.match(/^([^.]+)\.vanity\.box$/i);
      if (m) existing.set(m[1].toLowerCase(), rec.id);
    }
    if (page >= (json.result_info?.total_pages ?? 1)) break;
    page++;
  }
  return existing;
}

/** Create a proxied A record for {name}.vanity.box */
async function createARecord(
  token: string, zoneId: string, name: string
): Promise<{ name: string; success: boolean; error?: string }> {
  const res = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "A",
      name: `${name}.vanity.box`,
      content: "192.0.2.1", // RFC 5737 dummy IP, Cloudflare proxied handles it
      ttl: 1, // Auto
      proxied: true,
    }),
  });
  if (res.status === 429) return { name, success: false, error: "rate-limited" };
  const json = await res.json();
  if (!json.success) {
    const errMsg = json.errors?.map((e: any) => e.message).join("; ") ?? "unknown";
    return { name, success: false, error: errMsg };
  }
  return { name, success: true };
}

/** Ensure a dynamic redirect rule exists: *.vanity.box → ud.me/{name}.vanity */
async function ensureRedirectRule(token: string, zoneId: string): Promise<string> {
  // Check existing rulesets for a matching rule
  const listRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/rulesets?phase=http_request_dynamic_redirect`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );

  let rulesetId: string | null = null;
  let existingRules: any[] = [];

  if (listRes.ok) {
    const listJson = await listRes.json();
    const rulesets = listJson.result ?? [];
    for (const rs of rulesets) {
      if (rs.phase === "http_request_dynamic_redirect") {
        rulesetId = rs.id;
        // Fetch full ruleset to see rules
        const fullRes = await fetch(
          `${CF_BASE}/zones/${zoneId}/rulesets/${rs.id}`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        if (fullRes.ok) {
          const fullJson = await fullRes.json();
          existingRules = fullJson.result?.rules ?? [];
        }
        break;
      }
    }
  }

  // Check if our vanity redirect rule already exists
  const vanityRule = existingRules.find((r: any) =>
    r.description === "Vanity Box to UD redirect"
  );

  if (vanityRule) {
    console.log("Redirect rule already exists:", vanityRule.id);
    return "exists";
  }

  const newRule = {
    expression: '(http.host matches "^[^.]+\\.vanity\\.box$")',
    description: "Vanity Box to UD redirect",
    action: "redirect",
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: {
          expression: 'concat("https://ud.me/", regex_replace(http.host, "\\\\.box$", ""))',
        },
        preserve_query_string: false,
      },
    },
  };

  if (rulesetId) {
    // Add rule to existing ruleset
    const addRes = await fetch(
      `${CF_BASE}/zones/${zoneId}/rulesets/${rulesetId}/rules`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      }
    );
    const addJson = await addRes.json();
    if (!addJson.success) {
      const err = JSON.stringify(addJson.errors);
      console.error("Failed to add redirect rule:", err);
      return `error: ${err}`;
    }
    console.log("Added redirect rule to existing ruleset");
    return "created";
  } else {
    // Create new ruleset with the rule
    const createRes = await fetch(
      `${CF_BASE}/zones/${zoneId}/rulesets`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Vanity Box Redirects",
          kind: "zone",
          phase: "http_request_dynamic_redirect",
          rules: [newRule],
        }),
      }
    );
    const createJson = await createRes.json();
    if (!createJson.success) {
      const err = JSON.stringify(createJson.errors);
      console.error("Failed to create redirect ruleset:", err);
      return `error: ${err}`;
    }
    console.log("Created new redirect ruleset");
    return "created";
  }
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

    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const singleDomain = body?.domain?.replace(/\.vanity$/i, "").trim().toLowerCase();

    // 1. Fetch domains from Dune
    const allDomains = await fetchDuneResults(DUNE_API_KEY);
    console.log(`Fetched ${allDomains.length} domains from Dune`);

    const domainsToProcess = singleDomain
      ? allDomains.filter((d) => d === singleDomain)
      : allDomains;

    if (singleDomain && domainsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ error: "Domain not found in Dune query", found: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Ensure the Cloudflare dynamic redirect rule exists
    const redirectStatus = await ensureRedirectRule(CF_API_TOKEN, ZONE_ID);
    console.log("Redirect rule status:", redirectStatus);

    // 3. Check existing DNS records
    const existing = await listExistingRecords(CF_API_TOKEN, ZONE_ID);
    console.log(`Existing DNS records: ${existing.size}`);

    // 4. Create missing DNS A records
    const missing = domainsToProcess.filter((d) => !existing.has(d));
    console.log(`Missing DNS records: ${missing.length}`);

    if (missing.length === 0) {
      return new Response(
        JSON.stringify({
          message: "All domains already configured",
          total: domainsToProcess.length,
          existing: domainsToProcess.length,
          created: 0,
          redirectRule: redirectStatus,
          redirectUrl: singleDomain ? `https://ud.me/${singleDomain}.vanity` : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ name: string; success: boolean; error?: string }> = [];
    for (let i = 0; i < missing.length; i++) {
      let result = await createARecord(CF_API_TOKEN, ZONE_ID, missing[i]);
      if (result.error === "rate-limited") {
        console.log("Rate limited, waiting 60s...");
        await sleep(60_000);
        result = await createARecord(CF_API_TOKEN, ZONE_ID, missing[i]);
      }
      results.push(result);
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
        redirectRule: redirectStatus,
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
