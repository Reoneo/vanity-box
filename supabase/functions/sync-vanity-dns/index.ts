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

/** Ensure wildcard DNS records exist (proxied) for both *.vanity.box and *.*.vanity.box */
async function ensureWildcardDNS(token: string, zoneId: string): Promise<Record<string, string>> {
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const wildcards = ["*.vanity.box", "*.*.vanity.box"];
  const results: Record<string, string> = {};

  for (const wc of wildcards) {
    const listRes = await fetch(
      `${CF_BASE}/zones/${zoneId}/dns_records?type=A&name=${wc}`,
      { headers: authHeaders }
    );
    if (listRes.ok) {
      const listJson = await listRes.json();
      const found = (listJson.result ?? []).find((r: any) => r.name === wc);
      if (found) { results[wc] = "exists"; continue; }
    }

    const createRes = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ type: "A", name: wc, content: "192.0.2.1", ttl: 1, proxied: true }),
    });
    const createJson = await createRes.json();
    if (!createJson.success) {
      results[wc] = `error: ${createJson.errors?.map((e: any) => e.message).join("; ")}`;
    } else {
      results[wc] = "created";
    }
  }
  return results;
}

/** Build the Cloudflare Worker script — redirects ANY *.vanity.box to ud.me */
function buildWorkerScript(): string {
  return `export default {
  async fetch(request) {
    const url = new URL(request.url);
    let host = url.hostname.toLowerCase();
    // Strip www. prefix so www.build.vanity.box works like build.vanity.box
    if (host.startsWith("www.")) host = host.slice(4);
    const match = host.match(/^([^.]+)\\.vanity\\.box$/);
    if (!match) return new Response("Not found", { status: 404 });
    const name = match[1];
    return Response.redirect("https://ud.me/" + name + ".vanity", 301);
  }
};
`;
}

/** Deploy/update the vanity-redirect Worker */
async function deployWorker(token: string, accountId: string, script: string): Promise<string> {
  const WORKER_NAME = "vanity-box-redirect";

  const form = new FormData();
  form.append(
    "metadata",
    new Blob(
      [JSON.stringify({ main_module: "worker.mjs", compatibility_date: "2024-01-01" })],
      { type: "application/json" }
    ),
    "metadata"
  );
  form.append(
    "worker.mjs",
    new Blob([script], { type: "application/javascript+module" }),
    "worker.mjs"
  );

  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/workers/scripts/${WORKER_NAME}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  const json = await res.json();
  if (!json.success) {
    const err = json.errors?.map((e: any) => e.message).join("; ") ?? "unknown";
    console.error("Worker deploy error:", err);
    return `error: ${err}`;
  }
  console.log("Worker deployed successfully");
  return "deployed";
}

/** Ensure Worker Routes exist for *.vanity.box/* AND www.*.vanity.box/* */
async function ensureWorkerRoute(token: string, zoneId: string): Promise<Record<string, string>> {
  const WORKER_NAME = "vanity-box-redirect";
  const PATTERNS = ["*.vanity.box/*", "www.*.vanity.box/*"];
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const listRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/workers/routes`,
    { headers: authHeaders }
  );
  const existingPatterns = new Set<string>();
  if (listRes.ok) {
    const listJson = await listRes.json();
    for (const r of listJson.result ?? []) existingPatterns.add(r.pattern);
  }

  const results: Record<string, string> = {};
  for (const pattern of PATTERNS) {
    if (existingPatterns.has(pattern)) {
      results[pattern] = "exists";
      continue;
    }
    const createRes = await fetch(
      `${CF_BASE}/zones/${zoneId}/workers/routes`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ pattern, script: WORKER_NAME }),
      }
    );
    const createJson = await createRes.json();
    if (!createJson.success) {
      results[pattern] = `error: ${createJson.errors?.map((e: any) => e.message).join("; ") ?? "unknown"}`;
    } else {
      results[pattern] = "created";
    }
  }
  return results;
}

/** Ensure a Cloudflare Redirect Rule strips www. from *.vanity.box requests */
async function ensureWwwPageRule(token: string, zoneId: string): Promise<string> {
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const RULESET_PHASE = "http_request_dynamic_redirect";
  const RULE_DESC = "Strip www from vanity.box subdomains";
  // Free-plan compatible: no regex/matches needed
  const expression = '(starts_with(http.host, "www.") and ends_with(http.host, ".vanity.box"))';

  const ruleBody = {
    expression,
    description: RULE_DESC,
    action: "redirect",
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: {
          expression: 'concat("https://", substring(http.host, 4), http.request.uri.path)',
        },
        preserve_query_string: true,
      },
    },
  };

  // Check existing rulesets for this phase
  const listRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/rulesets/phases/${RULESET_PHASE}/entrypoint`,
    { headers: authHeaders }
  );

  if (listRes.ok) {
    const listJson = await listRes.json();
    const rules = listJson.result?.rules ?? [];
    if (rules.find((r: any) => r.description === RULE_DESC)) return "exists";

    const rulesetId = listJson.result?.id;
    const updateRes = await fetch(
      `${CF_BASE}/zones/${zoneId}/rulesets/${rulesetId}`,
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ rules: [...rules, ruleBody] }),
      }
    );
    const updateJson = await updateRes.json();
    if (!updateJson.success) {
      return `error: ${updateJson.errors?.map((e: any) => e.message).join("; ")}`;
    }
    return "created";
  }

  // Create new ruleset
  const createRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/rulesets`,
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Vanity Box Redirects",
        kind: "zone",
        phase: RULESET_PHASE,
        rules: [ruleBody],
      }),
    }
  );
  const createJson = await createRes.json();
  if (!createJson.success) {
    return `error: ${createJson.errors?.map((e: any) => e.message).join("; ")}`;
  }
  return "created";
}

/** Create individual www.<name>.vanity.box CNAME records so Total TLS auto-issues certs */
async function ensureWwwCNAMEs(
  token: string,
  zoneId: string,
  names: string[]
): Promise<{ created: number; existed: number; errors: string[] }> {
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Fetch all existing DNS records in the zone that match www.*.vanity.box
  const existing = new Set<string>();
  let page = 1;
  while (true) {
    const res = await fetch(
      `${CF_BASE}/zones/${zoneId}/dns_records?per_page=100&page=${page}&type=CNAME`,
      { headers: authHeaders }
    );
    if (!res.ok) break;
    const json = await res.json();
    for (const rec of json.result ?? []) {
      if (rec.name?.startsWith("www.") && rec.name?.endsWith(".vanity.box")) {
        existing.add(rec.name);
      }
    }
    if (page >= (json.result_info?.total_pages ?? 1)) break;
    page++;
  }
  console.log(`Existing www CNAME records: ${existing.size}`);

  let created = 0;
  let existed = 0;
  const errors: string[] = [];

  // Process in batches of 20
  for (let i = 0; i < names.length; i += 20) {
    const batch = names.slice(i, i + 20);
    const results = await Promise.all(
      batch.map(async (name) => {
        const fqdn = `www.${name}.vanity.box`;
        if (existing.has(fqdn)) return { name, status: "exists" as const };

        const res = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            type: "CNAME",
            name: fqdn,
            content: "vanity.box",
            ttl: 1,
            proxied: true,
          }),
        });
        const json = await res.json();
        if (json.success) return { name, status: "created" as const };
        const err = json.errors?.map((e: any) => e.message).join("; ") ?? "unknown";
        return { name, status: "error" as const, error: err };
      })
    );
    for (const r of results) {
      if (r.status === "exists") existed++;
      else if (r.status === "created") created++;
      else errors.push(`${r.name}: ${r.error}`);
    }
  }
  return { created, existed, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const CF_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    if (!CF_API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN not configured");
    const ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!ZONE_ID) throw new Error("CLOUDFLARE_ZONE_ID not configured");
    const ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    if (!ACCOUNT_ID) throw new Error("CLOUDFLARE_ACCOUNT_ID not configured");

    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const action = body?.action || "sync";

    // === CLEANUP ACTION: list/delete old individual DNS records ===
    if (action === "cleanup") {
      const dryRun = body?.dryRun !== false;
      const authHeaders = { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" };
      const toDelete: { id: string; name: string; type: string }[] = [];
      let page = 1;
      while (true) {
        const res = await fetch(
          `${CF_BASE}/zones/${ZONE_ID}/dns_records?per_page=100&page=${page}`,
          { headers: authHeaders }
        );
        if (!res.ok) throw new Error(`CF list error: ${await res.text()}`);
        const json = await res.json();
        for (const rec of json.result ?? []) {
          if (
            rec.name?.endsWith(".vanity.box") &&
            rec.name !== "vanity.box" &&
            rec.name !== "*.vanity.box" &&
            rec.name !== "*.*.vanity.box" &&
            !rec.name.startsWith("www.")  // preserve www CNAMEs managed by sync
          ) {
            toDelete.push({ id: rec.id, name: rec.name, type: rec.type });
          }
        }
        if (page >= (json.result_info?.total_pages ?? 1)) break;
        page++;
      }
      console.log(`Found ${toDelete.length} records to delete`);

      if (dryRun) {
        return new Response(
          JSON.stringify({
            mode: "dry_run",
            count: toDelete.length,
            records: toDelete.map(r => `${r.type} ${r.name}`),
            message: 'Send {"action":"cleanup","dryRun":false} to delete',
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let deleted = 0;
      const errors: string[] = [];
      for (let i = 0; i < toDelete.length; i += 20) {
        const batch = toDelete.slice(i, i + 20);
        const results = await Promise.all(
          batch.map(async (rec) => {
            const res = await fetch(
              `${CF_BASE}/zones/${ZONE_ID}/dns_records/${rec.id}`,
              { method: "DELETE", headers: authHeaders }
            );
            const json = await res.json();
            return { rec, success: json.success, errors: json.errors };
          })
        );
        for (const r of results) {
          if (r.success) deleted++;
          else errors.push(`${r.rec.name}: ${r.errors?.map((e: any) => e.message).join("; ")}`);
        }
      }
      return new Response(
        JSON.stringify({ deleted, errors: errors.length > 0 ? errors : undefined, total: toDelete.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SYNC-SINGLE ACTION: manually create www CNAME for a specific name ===
    if (action === "sync-single") {
      const name = String(body?.name || "").replace(/\.vanity$/i, "").trim().toLowerCase();
      if (!name) {
        return new Response(
          JSON.stringify({ error: "name is required (e.g. remotelyproduction)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const wwwResult = await ensureWwwCNAMEs(CF_API_TOKEN, ZONE_ID, [name]);
      return new Response(
        JSON.stringify({
          name,
          fqdn: `www.${name}.vanity.box`,
          ...wwwResult,
          message: wwwResult.created > 0
            ? `Created www.${name}.vanity.box CNAME. Total TLS will auto-issue a cert (5-15 min).`
            : wwwResult.existed > 0
            ? `www.${name}.vanity.box already exists. If HTTPS isn't working, wait for Total TLS to issue the cert.`
            : `Error creating CNAME: ${wwwResult.errors.join("; ")}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SYNC ACTION (default) ===
    const DUNE_API_KEY = Deno.env.get("DUNE_API_KEY");
    if (!DUNE_API_KEY) throw new Error("DUNE_API_KEY not configured");

    // 1. Ensure wildcard DNS record
    const dnsStatus = await ensureWildcardDNS(CF_API_TOKEN, ZONE_ID);
    console.log("Wildcard DNS:", dnsStatus);

    // 2. Deploy Worker (redirects ANY *.vanity.box — no allowlist needed)
    const script = buildWorkerScript();
    const workerStatus = await deployWorker(CF_API_TOKEN, ACCOUNT_ID, script);
    console.log("Worker:", workerStatus);

    // 3. Ensure Worker Route
    const routeStatus = await ensureWorkerRoute(CF_API_TOKEN, ZONE_ID);
    console.log("Routes:", JSON.stringify(routeStatus));

    // 4. Ensure www page rule (www.X.vanity.box → X.vanity.box)
    const wwwStatus = await ensureWwwPageRule(CF_API_TOKEN, ZONE_ID);
    console.log("WWW page rule:", wwwStatus);

    // 5. Fetch all vanity names from Dune and create www CNAME records
    //    so Total TLS auto-issues certs for each www.<name>.vanity.box
    const names = await fetchDuneResults(DUNE_API_KEY);
    console.log(`Fetched ${names.length} names from Dune`);
    const wwwCnames = await ensureWwwCNAMEs(CF_API_TOKEN, ZONE_ID, names);
    console.log("WWW CNAMEs:", JSON.stringify(wwwCnames));

    const message = `Synced ${names.length} names. Created ${wwwCnames.created} www CNAME records (${wwwCnames.existed} existed). Total TLS will auto-issue certs for each.`;

    return new Response(
      JSON.stringify({
        wildcardDns: dnsStatus,
        worker: workerStatus,
        workerRoute: routeStatus,
        wwwRedirectRule: wwwStatus,
        wwwCnames,
        namesCount: names.length,
        message,
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
