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

/** Ensure Worker Route exists for *.vanity.box/* */
async function ensureWorkerRoute(token: string, zoneId: string): Promise<string> {
  const WORKER_NAME = "vanity-box-redirect";
  const ROUTE_PATTERN = "*.vanity.box/*";
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const listRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/workers/routes`,
    { headers: authHeaders }
  );
  if (listRes.ok) {
    const listJson = await listRes.json();
    if ((listJson.result ?? []).find((r: any) => r.pattern === ROUTE_PATTERN)) {
      return "exists";
    }
  }

  const createRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/workers/routes`,
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ pattern: ROUTE_PATTERN, script: WORKER_NAME }),
    }
  );
  const createJson = await createRes.json();
  if (!createJson.success) {
    return `error: ${createJson.errors?.map((e: any) => e.message).join("; ") ?? "unknown"}`;
  }
  return "created";
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

/** Check & attempt to enable Total TLS / Advanced Cert for deep subdomains */
async function checkAndEnableTotalTLS(token: string, zoneId: string): Promise<{
  status: string;
  wwwHttpsSupported: boolean;
  details: string;
}> {
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 1. Check current Total TLS setting
  const ttsRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/acm/total_tls`,
    { headers: authHeaders }
  );
  if (ttsRes.ok) {
    const ttsJson = await ttsRes.json();
    const enabled = ttsJson.result?.enabled === true;
    console.log("Total TLS current state:", JSON.stringify(ttsJson.result));

    if (enabled) {
      return {
        status: "total_tls_enabled",
        wwwHttpsSupported: true,
        details: "Total TLS is active — HTTPS works for www.*.vanity.box",
      };
    }

    // Try to enable Total TLS
    const enableRes = await fetch(
      `${CF_BASE}/zones/${zoneId}/acm/total_tls`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ enabled: true }),
      }
    );
    const enableJson = await enableRes.json();
    console.log("Total TLS enable response:", JSON.stringify(enableJson));

    if (enableJson.success && enableJson.result?.enabled) {
      return {
        status: "total_tls_just_enabled",
        wwwHttpsSupported: true,
        details: "Total TLS was just enabled — HTTPS for www.*.vanity.box will work once certs propagate (a few minutes)",
      };
    }

    // If enabling failed, check if it's a plan limitation
    const errMsg = enableJson.errors?.map((e: any) => e.message).join("; ") || "unknown";
    console.warn("Total TLS enable failed:", errMsg);
  } else {
    console.warn("Total TLS check failed:", ttsRes.status, await ttsRes.text());
  }

  // 2. Fallback: check if there's an Advanced Certificate covering *.*.vanity.box
  const certRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/ssl/certificate_packs?status=active`,
    { headers: authHeaders }
  );
  if (certRes.ok) {
    const certJson = await certRes.json();
    const packs = certJson.result ?? [];
    for (const pack of packs) {
      const hosts: string[] = pack.hosts ?? [];
      if (hosts.some((h: string) => h === "*.*.vanity.box" || h === "*.vanity.box" && pack.type === "advanced")) {
        return {
          status: "advanced_cert_found",
          wwwHttpsSupported: true,
          details: `Advanced certificate pack covers deep subdomains (pack ${pack.id})`,
        };
      }
    }
  }

  // 3. Try ordering an Advanced Certificate if ACM is available
  const orderRes = await fetch(
    `${CF_BASE}/zones/${zoneId}/ssl/certificate_packs/order`,
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        type: "advanced",
        hosts: ["vanity.box", "*.vanity.box", "*.*.vanity.box"],
        validation_method: "txt",
        validity_days: 365,
        certificate_authority: "lets_encrypt",
      }),
    }
  );
  const orderJson = await orderRes.json();
  console.log("ACM order response:", JSON.stringify(orderJson));

  if (orderJson.success) {
    return {
      status: "advanced_cert_ordered",
      wwwHttpsSupported: true,
      details: `Advanced certificate ordered (pack ${orderJson.result?.id}) — HTTPS for www.*.vanity.box will work once validated`,
    };
  }

  const orderErr = orderJson.errors?.map((e: any) => e.message).join("; ") || "unknown";
  return {
    status: "www_https_unavailable",
    wwwHttpsSupported: false,
    details: `Cannot enable deep-subdomain HTTPS: Total TLS and ACM both unavailable. Error: ${orderErr}. ` +
      `Enable Advanced Certificate Manager in Cloudflare dashboard (SSL/TLS → Edge Certificates → Total TLS) ` +
      `or upgrade your plan. HTTP www.*.vanity.box redirects work, but HTTPS will fail at TLS handshake.`,
  };
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

    // 4. Ensure www page rule (www.X.vanity.box → X.vanity.box)
    const wwwStatus = await ensureWwwPageRule(CF_API_TOKEN, ZONE_ID);
    console.log("WWW page rule:", wwwStatus);

    // 5. Check & enable TLS for deep subdomains (www.*.vanity.box)
    const tlsStatus = await checkAndEnableTotalTLS(CF_API_TOKEN, ZONE_ID);
    console.log("TLS status:", JSON.stringify(tlsStatus));

    const message = tlsStatus.wwwHttpsSupported
      ? "All *.vanity.box and www.*.vanity.box subdomains now redirect to ud.me/{name}.vanity (HTTPS included)"
      : "*.vanity.box redirects work. www.*.vanity.box works over HTTP only — HTTPS requires Advanced Certificate Manager (see tlsCertificate.details)";

    return new Response(
      JSON.stringify({
        wildcardDns: dnsStatus,
        worker: workerStatus,
        workerRoute: routeStatus,
        wwwRedirectRule: wwwStatus,
        tlsCertificate: tlsStatus,
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
