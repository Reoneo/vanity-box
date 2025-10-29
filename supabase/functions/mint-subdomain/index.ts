// supabase/functions/mint-subdomain/index.ts
// Minimal, bulletproof echo + validation using the recommended Deno.serve API.
// If THIS returns 200 with your payload, the function path, deploy, and CORS are correct.

type Json = Record<string, unknown>;

// CORS shared headers
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Helper to respond JSON with CORS
const j = (body: Json, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (req.method !== "POST") {
      return j({ ok: false, error: "Method not allowed" }, 405);
    }

    // Parse JSON safely
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return j({ ok: false, error: "Invalid JSON body" }, 400);
    }

    // Basic validation to mirror your client payload
    const { subdomain, walletAddress, domain } = body ?? {};
    const missing: string[] = [];
    if (!subdomain) missing.push("subdomain");
    if (!walletAddress) missing.push("walletAddress");
    if (!domain) missing.push("domain");
    if (missing.length) {
      return j({ ok: false, error: `Missing: ${missing.join(", ")}` }, 400);
    }

    // ENV sanity (don't block success; just report)
    const envReport = {
      HAS_NAMESTONE_API_KEY: Boolean(Deno.env.get("NAMESTONE_API_KEY")),
      HAS_NAMESTONE_API_KEY_30315: Boolean(Deno.env.get("NAMESTONE_API_KEY_30315")),
      HAS_NAMESTONE_API_KEY_TEAMXRP: Boolean(Deno.env.get("NAMESTONE_API_KEY_TEAMXRP")),
      HAS_NAMESTONE_API_KEY_TERMUX: Boolean(Deno.env.get("NAMESTONE_API_KEY_TERMUX")),
      HAS_NAMESTONE_API_KEY_MEXIPAY: Boolean(Deno.env.get("NAMESTONE_API_KEY_MEXIPAY")),
      HAS_NAMESTONE_API_KEY_GUAVAPAY: Boolean(Deno.env.get("NAMESTONE_API_KEY_GUAVAPAY")),
      HAS_NAMESTONE_API_KEY_SPYDA: Boolean(Deno.env.get("NAMESTONE_API_KEY_SPYDA")),
      HAS_NAMESTONE_API_KEY_FLIRTAD: Boolean(Deno.env.get("NAMESTONE_API_KEY_FLIRTAD")),
    };

    // Echo back what we got — this proves end-to-end wiring.
    return j({
      ok: true,
      message: "mint-subdomain function reachable",
      received: body,
      envReport,
      ts: Date.now(),
    });
  } catch (e: any) {
    console.error("[mint-subdomain] fatal:", e);
    return j({ ok: false, error: String(e?.message || e) }, 500);
  }
});
