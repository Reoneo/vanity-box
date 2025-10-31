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
    const body = await req.json();
    const { subdomain, walletAddress, domain, registrationMonths, paymentMethod, paymentAmount, networkFee, txHash } = body;

    console.log(`[Mint] Received request:`, { subdomain, walletAddress, domain, registrationMonths });

    if (!subdomain || !walletAddress || !domain) {
      console.error("[Mint] Missing required fields:", { subdomain, walletAddress, domain });
      return j({ ok: false, error: "Missing required fields" }, 400);
    }

    // Parse subdomain label and domain safely
    const subdomainLabel = String(subdomain).split(".")[0].trim().toLowerCase();
    const cleanDomain = String(domain).trim().toLowerCase();

    console.log(`[Mint] Parsed: label="${subdomainLabel}", domain="${cleanDomain}"`);

    // Validate subdomain label format (ENS-safe)
    if (!/^[a-z0-9-]{1,63}$/.test(subdomainLabel)) {
      console.error("[Mint] Invalid subdomain label format:", subdomainLabel);
      return j({ ok: false, error: "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens." }, 400);
    }

    if (!cleanDomain || cleanDomain.length === 0) {
      console.error("[Mint] Domain is empty after processing");
      return j({ ok: false, error: "Invalid domain format" }, 400);
    }

    // Fetch domain config and API key from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Mint] Fetching domain config for: ${cleanDomain}`);
    
    const { data: domainConfig, error: configError } = await supabase
      .from("domain_configs")
      .select("*")
      .eq("domain_name", cleanDomain)
      .eq("status", "active")
      .maybeSingle();

    if (configError) {
      console.error("[Mint] Error fetching domain config:", configError);
      return j({ ok: false, error: `Database error: ${configError.message}` }, 500);
    }

    let namestoneApiKey: string | undefined;

    if (domainConfig) {
      console.log(`[Mint] Found domain config for ${cleanDomain}, secret: ${domainConfig.api_key_secret_name}`);
      namestoneApiKey = Deno.env.get(domainConfig.api_key_secret_name);
    } else {
      console.log(`[Mint] No domain config found for ${cleanDomain}, using default`);
      namestoneApiKey = Deno.env.get("NAMESTONE_API_KEY");
    }

    if (!namestoneApiKey) {
      console.error(`[Mint] No API key found for domain: ${cleanDomain}`);
      return j({ ok: false, error: `Domain ${cleanDomain} is not configured. Please contact support.` }, 500);
    }

    console.log(`[Mint] API key resolved for ${cleanDomain}`);

    // Calculate dates
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + (registrationMonths || 12));
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 90);

    // Call Namestone set-names API (official endpoint)
    const namestonePayload = {
      domain: cleanDomain,
      names: [
        {
          name: subdomainLabel,
          address: walletAddress.toLowerCase(),
          text_records: {
            registration_months: String(registrationMonths || 12),
            expiry_date: expiryDate.toISOString(),
            grace_period_end: gracePeriodEnd.toISOString(),
          },
        },
      ],
    };

    console.log(`[Namestone] Calling set-names for ${subdomainLabel}.${cleanDomain}`, namestonePayload);
    const namestoneRes = await fetch("https://namestone.com/api/public_v1/set-names", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": namestoneApiKey,
      },
      body: JSON.stringify(namestonePayload),
    });

    console.log(`[Namestone] Response status: ${namestoneRes.status}`);

    if (!namestoneRes.ok) {
      const errorText = await namestoneRes.text();
      console.error(`[Namestone] Error: ${namestoneRes.status} - ${errorText}`);
      return j({ ok: false, error: `Namestone API error: ${errorText}` }, 500);
    }

    const namestoneData = await namestoneRes.json();
    console.log(`[Namestone] Success:`, namestoneData);

    // Record in minted_domains
    const { error: dbError } = await supabase.from("minted_domains").insert({
      full_name: `${subdomainLabel}.${cleanDomain}`,
      subdomain: subdomainLabel,
      domain: cleanDomain,
      wallet_address: walletAddress.toLowerCase(),
      registration_months: registrationMonths || 12,
      registration_date: now.toISOString(),
      expiry_date: expiryDate.toISOString(),
      grace_period_end: gracePeriodEnd.toISOString(),
      payment_method: paymentMethod,
      payment_amount: paymentAmount,
      network_fee: networkFee,
      tx_hash: txHash || `free-mint-${Date.now()}`,
    });

    if (dbError) {
      console.error("[DB] Error:", dbError);
      return j({ ok: false, error: `Database error: ${dbError.message}` }, 500);
    }

    console.log(`[Mint] Complete for ${subdomainLabel}.${cleanDomain}`);
    return j({ ok: true, subdomain: `${subdomainLabel}.${cleanDomain}`, expiryDate: expiryDate.toISOString() });
  } catch (e: any) {
    console.error("[Mint] Fatal:", e);
    return j({ ok: false, error: String(e?.message || e) }, 500);
  }
});
