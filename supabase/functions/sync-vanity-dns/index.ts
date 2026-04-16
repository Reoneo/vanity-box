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
  const listRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/dns_records?type=A&name=*.vanity.box`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  if (listRes.ok) {
    const listJson = await listRes.json();
    const wildcard = (listJson.result ?? []).find((r: any) => r.name === "*.vanity.box");
    if (wildcard) return "exists";
  }

  const createRes = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "A", name: "*.vanity.box", content: "192.0.2.1", ttl: 1, proxied: true }),
  });
  const createJson = await createRes.json();
  if (!createJson.success) {
    return `error: ${createJson.errors?.map((e: any) => e.message).join("; ")}`;
  }
  return "created";
}

/** Build the Cloudflare Worker script — redirects ANY *.vanity.box to ud.me */
function buildWorkerScript(): string {
  return `export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
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

/** Ensure a Worker Route exists for *.vanity.box/* */
async function ensureWorkerRoute(token: string, zoneId: string): Promise<string> {
  const WORKER_NAME = "vanity-box-redirect";
  const ROUTE_PATTERN = "*.vanity.box/*";

  // List existing routes
  const listRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/workers/routes`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  if (listRes.ok) {
    const listJson = await listRes.json();
    const existing = (listJson.result ?? []).find((r: any) => r.pattern === ROUTE_PATTERN);
    if (existing) {
      console.log("Worker route already exists:", existing.id);
      return "exists";
    }
  }

  // Create route
  const createRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/workers/routes`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pattern: ROUTE_PATTERN, script: WORKER_NAME }),
    }
  );
  const createJson = await createRes.json();
  if (!createJson.success) {
    const err = createJson.errors?.map((e: any) => e.message).join("; ") ?? "unknown";
    console.error("Worker route error:", err);
    return `error: ${err}`;
  }
  console.log("Worker route created");
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
            rec.name !== "*.vanity.box"
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
      // Delete in parallel batches of 20
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

    // === SYNC ACTION (default) ===
    // 1. Ensure wildcard DNS record
    const dnsStatus = await ensureWildcardDNS(CF_API_TOKEN, ZONE_ID);
    console.log("Wildcard DNS:", dnsStatus);

    // 2. Deploy Worker (redirects ANY *.vanity.box — no allowlist needed)
    const script = buildWorkerScript();
    const workerStatus = await deployWorker(CF_API_TOKEN, ACCOUNT_ID, script);
    console.log("Worker:", workerStatus);

    // 3. Ensure Worker Route
    const routeStatus = await ensureWorkerRoute(CF_API_TOKEN, ZONE_ID);
    console.log("Route:", routeStatus);

    return new Response(
      JSON.stringify({
        wildcardDns: dnsStatus,
        worker: workerStatus,
        workerRoute: routeStatus,
        message: "All *.vanity.box subdomains now redirect to ud.me/{name}.vanity",
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
