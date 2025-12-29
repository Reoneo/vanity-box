import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const j = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

// Set address in Namestone directly (for repair)
async function setAddressInNamestone(params: {
  apiKey: string;
  parentDomain: string;
  subname: string;
  walletAddress: string;
}): Promise<{ success: boolean; error?: string }> {
  const { apiKey, parentDomain, subname, walletAddress } = params;

  try {
    // First fetch existing data to preserve contenthash and text_records
    const getRes = await fetch('https://namestone.com/api/public_v1/get-names', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        domain: parentDomain,
        name: subname,
      }),
    });

    let existingData: any = {};
    if (getRes.ok) {
      const data = await getRes.json();
      if (Array.isArray(data) && data.length > 0) {
        existingData = data[0];
      }
    }

    // Build payload preserving existing data but updating address
    const payload: any = {
      name: subname,
      address: walletAddress,
    };

    // Preserve contenthash if exists
    if (existingData.contenthash) {
      payload.contenthash = existingData.contenthash;
    }

    // Preserve text_records if exist
    if (existingData.text_records && Object.keys(existingData.text_records).length > 0) {
      payload.text_records = existingData.text_records;
    }

    console.log(`📝 Setting address for ${subname}.${parentDomain}:`, walletAddress);

    const res = await fetch('https://namestone.com/api/public_v1/set-names', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        domain: parentDomain,
        names: [payload],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, error: `Namestone ${res.status}: ${errorText}` };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

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

    // Get domain configs for API keys
    const { data: domainConfigs } = await supabase
      .from("domain_configs")
      .select("domain_name, api_key_secret_name")
      .eq("status", "active");

    const apiKeyMap: Record<string, string> = {};
    for (const config of domainConfigs || []) {
      const key = Deno.env.get(config.api_key_secret_name);
      if (key) {
        apiKeyMap[config.domain_name] = key;
      }
    }

    // Add default API key
    const defaultKey = Deno.env.get("NAMESTONE_API_KEY");

    const results = {
      total: domains?.length || 0,
      processed: 0,
      addressRepaired: 0,
      redirectRepaired: 0,
      failed: 0,
      errors: [] as any[],
      successes: [] as any[],
    };

    // Process each domain
    for (const domain of domains || []) {
      results.processed++;
      
      console.log(`[repair-domain-redirects] [${results.processed}/${results.total}] Processing: ${domain.full_name}`);

      const apiKey = apiKeyMap[domain.domain] || defaultKey;
      if (!apiKey) {
        console.error(`[repair-domain-redirects] ❌ No API key for domain: ${domain.domain}`);
        results.failed++;
        results.errors.push({
          domain: domain.full_name,
          error: `No API key for ${domain.domain}`,
        });
        continue;
      }

      try {
        // STEP 1: Repair address in Namestone
        const addressResult = await setAddressInNamestone({
          apiKey,
          parentDomain: domain.domain,
          subname: domain.subdomain,
          walletAddress: domain.wallet_address,
        });

        if (!addressResult.success) {
          console.error(`[repair-domain-redirects] ❌ Address repair failed: ${domain.full_name}`, addressResult.error);
          results.failed++;
          results.errors.push({
            domain: domain.full_name,
            step: 'address',
            error: addressResult.error,
          });
          continue;
        }

        console.log(`[repair-domain-redirects] ✅ Address repaired: ${domain.full_name}`);
        results.addressRepaired++;

        // STEP 2: Repair redirect (contenthash)
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
          console.error(`[repair-domain-redirects] ❌ Redirect repair failed: ${domain.full_name}`, redirectError);
          results.failed++;
          results.errors.push({
            domain: domain.full_name,
            step: 'redirect',
            error: redirectError.message || String(redirectError),
          });
        } else if (redirectData?.error) {
          console.error(`[repair-domain-redirects] ❌ Redirect repair failed: ${domain.full_name}`, redirectData.error);
          results.failed++;
          results.errors.push({
            domain: domain.full_name,
            step: 'redirect',
            error: redirectData.error,
          });
        } else {
          console.log(`[repair-domain-redirects] ✅ Redirect repaired: ${domain.full_name}`, {
            cid: redirectData?.cid,
            contenthash: redirectData?.contenthash,
          });
          results.redirectRepaired++;
          results.successes.push({
            domain: domain.full_name,
            wallet: domain.wallet_address,
            cid: redirectData?.cid,
            contenthash: redirectData?.contenthash,
          });
        }
      } catch (err: any) {
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
      message: `Processed ${results.processed} domains: ${results.addressRepaired} addresses repaired, ${results.redirectRepaired} redirects repaired, ${results.failed} failed`,
      results,
    });

  } catch (e: any) {
    console.error("[repair-domain-redirects] Fatal error:", e);
    return j({ ok: false, error: String(e?.message || e) }, 500);
  }
});
