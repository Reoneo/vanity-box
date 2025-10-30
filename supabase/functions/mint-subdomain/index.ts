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

    // Extract subdomain label and domain
    const subdomainLabel = subdomain.split(".")[0].toLowerCase().trim();
    const cleanDomain = domain.replace(/^\$/, "").toLowerCase().trim();

    console.log(`[Mint] Processed: label="${subdomainLabel}", domain="${cleanDomain}"`);

    if (!cleanDomain || cleanDomain.length === 0) {
      console.error("[Mint] Domain is empty after processing");
      return j({ ok: false, error: "Invalid domain format" }, 400);
    }

    // Get API key for domain
    const apiKeyMap: Record<string, string | undefined> = {
      "$mith.eth": Deno.env.get("NAMESTONE_API_KEY_MITH_ETH"),
      "30315.eth": Deno.env.get("NAMESTONE_API_KEY_30315"),
      "flirtad.eth": Deno.env.get("NAMESTONE_API_KEY_FLIRTAD"),
      "guavapay.eth": Deno.env.get("NAMESTONE_API_KEY_GUAVAPAY"),
      "mexipay.eth": Deno.env.get("NAMESTONE_API_KEY_MEXIPAY"),
      "smith.cash": Deno.env.get("NAMESTONE_API_KEY_SMITH_CASH"),
      "spyda.eth": Deno.env.get("NAMESTONE_API_KEY_SPYDA"),
      "teamxrp.eth": Deno.env.get("NAMESTONE_API_KEY_TEAMXRP"),
      "termux.eth": Deno.env.get("NAMESTONE_API_KEY_TERMUX"),
    };

    const namestoneApiKey = apiKeyMap[cleanDomain] || Deno.env.get("NAMESTONE_API_KEY");
    console.log(`[Mint] Using API key for domain: ${cleanDomain}, keyFound: ${!!namestoneApiKey}`);
    
    if (!namestoneApiKey) {
      console.error(`[Mint] No API key found for domain: ${cleanDomain}`);
      return j({ ok: false, error: `No API key configured for domain ${cleanDomain}` }, 500);
    }

    // Calculate dates
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + (registrationMonths || 12));
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 90);

    // Call Namestone set-names
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
    const namestoneRes = await fetch("https://namestone.xyz/api/public_v1/set-names", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${namestoneApiKey}`,
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
