const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CF_BASE = "https://api.cloudflare.com/client/v4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const CF_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    if (!CF_API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN not configured");
    const ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!ZONE_ID) throw new Error("CLOUDFLARE_ZONE_ID not configured");

    let body: any = {};
    try { body = await req.json(); } catch {}
    const dryRun = body?.dryRun !== false; // default to dry run

    const authHeaders = { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" };

    // Collect all DNS records that match *.vanity.box (excluding the zone apex)
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
        // Match individual subdomain records like "afrobeat.vanity.box", "www.afrobeat.vanity.box"
        // but NOT the zone apex "vanity.box" or essential records
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
          message: "Send {\"dryRun\": false} to actually delete these records",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete records
    let deleted = 0;
    const errors: string[] = [];
    for (const rec of toDelete) {
      const res = await fetch(
        `${CF_BASE}/zones/${ZONE_ID}/dns_records/${rec.id}`,
        { method: "DELETE", headers: authHeaders }
      );
      const json = await res.json();
      if (json.success) {
        deleted++;
      } else {
        errors.push(`${rec.name}: ${json.errors?.map((e: any) => e.message).join("; ")}`);
      }
    }

    return new Response(
      JSON.stringify({ deleted, errors: errors.length > 0 ? errors : undefined, total: toDelete.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
