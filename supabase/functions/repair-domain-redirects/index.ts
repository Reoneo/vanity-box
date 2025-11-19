import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const j = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    console.log('[repair-domain-redirects] Starting repair process...');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all minted domains
    const { data: domains, error: domainsError } = await supabase
      .from("minted_domains")
      .select("subdomain, domain, full_name, wallet_address")
      .order("created_at", { ascending: false });

    if (domainsError) {
      console.error('[repair-domain-redirects] Error fetching domains:', domainsError);
      return j({ ok: false, error: domainsError.message }, 500);
    }

    console.log(`[repair-domain-redirects] Found ${domains?.length || 0} domains to check`);

    const results = {
      total: domains?.length || 0,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      successes: [] as any[],
    };

    // Process each domain
    for (const domain of domains || []) {
      results.processed++;
      
      console.log(`[repair-domain-redirects] [${results.processed}/${results.total}] Processing: ${domain.full_name}`);

      try {
        const { data: redirectData, error: redirectError } = await supabase.functions.invoke(
          'set-namestone-redirect',
          {
            body: {
              parentDomain: domain.domain,
              subname: domain.subdomain,
              redirectType: "default",
            },
          }
        );

        if (redirectError) {
          console.error(`[repair-domain-redirects] ❌ Failed: ${domain.full_name}`, redirectError);
          results.failed++;
          results.errors.push({
            domain: domain.full_name,
            error: redirectError.message || String(redirectError),
          });
        } else if (redirectData?.error) {
          console.error(`[repair-domain-redirects] ❌ Failed: ${domain.full_name}`, redirectData.error);
          results.failed++;
          results.errors.push({
            domain: domain.full_name,
            error: redirectData.error,
          });
        } else {
          console.log(`[repair-domain-redirects] ✅ Success: ${domain.full_name}`, {
            cid: redirectData?.cid,
            contenthash: redirectData?.contenthash,
          });
          results.successful++;
          results.successes.push({
            domain: domain.full_name,
            cid: redirectData?.cid,
            contenthash: redirectData?.contenthash,
          });
        }
      } catch (err) {
        console.error(`[repair-domain-redirects] ❌ Exception for: ${domain.full_name}`, err);
        results.failed++;
        results.errors.push({
          domain: domain.full_name,
          error: err?.message || String(err),
        });
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[repair-domain-redirects] Repair complete:', results);

    return j({
      ok: true,
      message: `Processed ${results.processed} domains: ${results.successful} successful, ${results.failed} failed`,
      results,
    });

  } catch (e: any) {
    console.error("[repair-domain-redirects] Fatal error:", e);
    return j({ ok: false, error: String(e?.message || e) }, 500);
  }
});
