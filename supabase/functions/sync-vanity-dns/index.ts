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
    allRows.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
  }
  console.log(`Dune total: ${allRows.length}`);
  return allRows
    .map((r) => String(r.domain || r.name || "").replace(/\.vanity$/i, "").trim().toLowerCase())
    .filter((d) => d.length > 0);
}

/** Ensure a wildcard *.vanity.box A record exists (proxied) */
async function ensureWildcardDNS(token: string, zoneId: string): Promise<string> {
  // Check if wildcard already exists
  const listRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/dns_records?type=A&name=*.vanity.box`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  if (listRes.ok) {
    const listJson = await listRes.json();
    const records = listJson.result ?? [];
    const wildcard = records.find((r: any) => r.name === "*.vanity.box");
    if (wildcard) {
      console.log("Wildcard DNS already exists:", wildcard.id);
      return "exists";
    }
  }

  // Create wildcard A record
  const createRes = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "A",
      name: "*.vanity.box",
      content: "192.0.2.1",
      ttl: 1,
      proxied: true,
    }),
  });
  const createJson = await createRes.json();
  if (!createJson.success) {
    const err = createJson.errors?.map((e: any) => e.message).join("; ") ?? "unknown";
    console.error("Failed to create wildcard DNS:", err);
    return `error: ${err}`;
  }
  console.log("Created wildcard DNS record");
  return "created";
}

/** Get or create the Bulk Redirect List for vanity domains */
async function getOrCreateBulkList(
  token: string, accountId: string
): Promise<{ listId: string; existingUrls: Set<string> }> {
  const LIST_NAME = "vanity_box_redirects";

  // List all lists
  const listRes = await fetch(
    `${CF_BASE}/accounts/${accountId}/rules/lists?per_page=50`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  if (!listRes.ok) throw new Error(`CF list lists error: ${await listRes.text()}`);
  const listJson = await listRes.json();

  let listId: string | null = null;
  for (const l of listJson.result ?? []) {
    if (l.name === LIST_NAME) {
      listId = l.id;
      break;
    }
  }

  if (!listId) {
    // Create the list
    const createRes = await fetch(
      `${CF_BASE}/accounts/${accountId}/rules/lists`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: LIST_NAME, kind: "redirect", description: "Vanity.box → ud.me redirects" }),
      }
    );
    const createJson = await createRes.json();
    if (!createJson.success) throw new Error(`CF create list error: ${JSON.stringify(createJson.errors)}`);
    listId = createJson.result.id;
    console.log("Created bulk redirect list:", listId);
    return { listId: listId!, existingUrls: new Set() };
  }

  // Fetch existing items
  const existingUrls = new Set<string>();
  let cursor: string | undefined;
  while (true) {
    const cursorParam = cursor ? `&cursor=${cursor}` : "";
    const itemsRes = await fetch(
      `${CF_BASE}/accounts/${accountId}/rules/lists/${listId}/items?per_page=500${cursorParam}`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!itemsRes.ok) break;
    const itemsJson = await itemsRes.json();
    for (const item of itemsJson.result ?? []) {
      if (item.redirect?.source_url) {
        existingUrls.add(item.redirect.source_url);
      }
    }
    cursor = itemsJson.result_info?.cursors?.after;
    if (!cursor) break;
  }

  console.log(`Bulk list ${listId} has ${existingUrls.size} existing items`);
  return { listId, existingUrls };
}

/** Add redirect items to the bulk list */
async function addBulkItems(
  token: string, accountId: string, listId: string, domains: string[]
): Promise<{ created: number; errors: string[] }> {
  // Cloudflare allows up to 1000 items per batch
  const items = domains.map((name) => ({
    redirect: {
      source_url: `https://${name}.vanity.box/`,
      target_url: `https://ud.me/${name}.vanity`,
      status_code: 301,
      include_subdomains: "disabled",
      subpath_matching: "enabled",
      preserve_query_string: "disabled",
      preserve_path_suffix: "disabled",
    },
  }));

  const errors: string[] = [];
  let created = 0;

  // Batch in groups of 500
  for (let i = 0; i < items.length; i += 500) {
    const batch = items.slice(i, i + 500);
    const res = await fetch(
      `${CF_BASE}/accounts/${accountId}/rules/lists/${listId}/items`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      }
    );
    const json = await res.json();
    if (!json.success) {
      errors.push(json.errors?.map((e: any) => e.message).join("; ") ?? "batch error");
    } else {
      created += batch.length;
    }
  }

  return { created, errors };
}

/** Ensure a Bulk Redirect Rule references our list */
async function ensureBulkRedirectRule(
  token: string, accountId: string, zoneId: string, listId: string
): Promise<string> {
  const RULE_NAME = "vanity_box_bulk_redirect";

  // Check existing rulesets in http_request_redirect phase
  const rsRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/rulesets/phases/http_request_redirect/entrypoint`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );

  if (rsRes.ok) {
    const rsJson = await rsRes.json();
    const rules = rsJson.result?.rules ?? [];
    const existing = rules.find((r: any) => r.description === RULE_NAME);
    if (existing) {
      console.log("Bulk redirect rule already exists");
      return "exists";
    }

    // Add rule to existing entrypoint
    const rulesetId = rsJson.result?.id;
    if (rulesetId) {
      const addRes = await fetch(
        `${CF_BASE}/zones/${zoneId}/rulesets/${rulesetId}/rules`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            expression: "true",
            description: RULE_NAME,
            action: "redirect",
            action_parameters: {
              from_list: { name: "vanity_box_redirects", key: "http.request.full_uri" },
            },
          }),
        }
      );
      const addJson = await addRes.json();
      if (!addJson.success) {
        const err = JSON.stringify(addJson.errors);
        console.error("Failed to add bulk redirect rule:", err);
        return `error: ${err}`;
      }
      return "created";
    }
  }

  // Create entrypoint ruleset with the rule
  const createRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/rulesets/phases/http_request_redirect/entrypoint`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: [{
          expression: "true",
          description: RULE_NAME,
          action: "redirect",
          action_parameters: {
            from_list: { name: "vanity_box_redirects", key: "http.request.full_uri" },
          },
        }],
      }),
    }
  );
  const createJson = await createRes.json();
  if (!createJson.success) {
    const err = JSON.stringify(createJson.errors);
    console.error("Failed to create bulk redirect entrypoint:", err);
    return `error: ${err}`;
  }
  console.log("Created bulk redirect entrypoint");
  return "created";
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
    const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    if (!ACCOUNT_ID) throw new Error("CLOUDFLARE_ACCOUNT_ID not configured");

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

    // 2. Ensure wildcard DNS exists
    const dnsStatus = await ensureWildcardDNS(CF_API_TOKEN, ZONE_ID);
    console.log("Wildcard DNS status:", dnsStatus);

    // 3. Get or create bulk redirect list
    const { listId, existingUrls } = await getOrCreateBulkList(CF_API_TOKEN, ACCOUNT_ID);

    // 4. Find missing redirect entries
    const missing = domainsToProcess.filter(
      (d) => !existingUrls.has(`https://${d}.vanity.box/`)
    );
    console.log(`Missing redirects: ${missing.length} of ${domainsToProcess.length}`);

    let created = 0;
    let errors: string[] = [];

    if (missing.length > 0) {
      const result = await addBulkItems(CF_API_TOKEN, ACCOUNT_ID, listId, missing);
      created = result.created;
      errors = result.errors;
    }

    // 5. Ensure bulk redirect rule exists
    const ruleStatus = await ensureBulkRedirectRule(CF_API_TOKEN, ACCOUNT_ID, ZONE_ID, listId);
    console.log("Bulk redirect rule status:", ruleStatus);

    return new Response(
      JSON.stringify({
        total: domainsToProcess.length,
        existing: domainsToProcess.length - missing.length,
        created,
        errors: errors.length > 0 ? errors : undefined,
        wildcardDns: dnsStatus,
        redirectRule: ruleStatus,
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
