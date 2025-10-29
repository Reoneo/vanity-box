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

    if (!subdomain || !walletAddress || !domain) {
      return j({ ok: false, error: "Missing required fields" }, 400);
    }

    console.log(`[Mint] ${subdomain} for ${walletAddress}`);

    // Extract subdomain label and domain
    const subdomainLabel = subdomain.split(".")[0].toLowerCase();
    const cleanDomain = domain.replace(/^\$/, "").toLowerCase();

    // Get API key for domain
    const apiKeyMap: Record<string, string | undefined> = {
      "30315.eth": Deno.env.get("NAMESTONE_API_KEY_30315"),
      "teamxrp.eth": Deno.env.get("NAMESTONE_API_KEY_TEAMXRP"),
      "termux.eth": Deno.env.get("NAMESTONE_API_KEY_TERMUX"),
      "mexipay.eth": Deno.env.get("NAMESTONE_API_KEY_MEXIPAY"),
      "guavapay.eth": Deno.env.get("NAMESTONE_API_KEY_GUAVAPAY"),
      "spyda.eth": Deno.env.get("NAMESTONE_API_KEY_SPYDA"),
      "flirtad.eth": Deno.env.get("NAMESTONE_API_KEY_FLIRTAD"),
    };

    const namestoneApiKey = apiKeyMap[cleanDomain] || Deno.env.get("NAMESTONE_API_KEY");
    if (!namestoneApiKey) {
      return j({ ok: false, error: `No API key for domain ${cleanDomain}` }, 500);
    }

    // Calculate dates
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + (registrationMonths || 12));
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 90);

    // Call Namestone set-names
    const namestonePayload = {
      names: [
        {
          name: subdomainLabel,
          address: walletAddress.toLowerCase(),
          domain: cleanDomain,
          text_records: {
            registration_months: String(registrationMonths || 12),
            expiry_date: expiryDate.toISOString(),
            grace_period_end: gracePeriodEnd.toISOString(),
          },
        },
      ],
    };

    console.log(`[Namestone] Calling set-names for ${subdomainLabel}.${cleanDomain}`);
    const namestoneRes = await fetch("https://namestone.xyz/api/public_v1/set-names", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${namestoneApiKey}`,
      },
      body: JSON.stringify(namestonePayload),
    });

    if (!namestoneRes.ok) {
      const errorText = await namestoneRes.text();
      console.error(`[Namestone] Error: ${namestoneRes.status} - ${errorText}`);
      return j({ ok: false, error: `Namestone API error: ${errorText}` }, 500);
    }

    const namestoneData = await namestoneRes.json();
    console.log(`[Namestone] Success:`, namestoneData);

    // Record in minted_domains
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      tx_hash: txHash,
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
