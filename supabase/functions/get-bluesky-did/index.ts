// Public edge function: returns the registered Bluesky DID for a given vanity name.
// Called by the Cloudflare Worker when serving /.well-known/atproto-did
// for *.vanity.box subdomains. Anonymous, no auth.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizeVanityName(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  // Accept either "mrs" or "mrs.vanity" – normalize to "mrs.vanity"
  if (s.endsWith(".vanity")) return s;
  if (/^[a-z0-9-]+$/.test(s)) return `${s}.vanity`;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let raw: string | null = url.searchParams.get("vanityName") ||
      url.searchParams.get("name") || null;

    if (!raw && (req.method === "POST" || req.method === "PUT")) {
      try {
        const body = await req.json();
        raw = body?.vanityName || body?.name || null;
      } catch { /* ignore */ }
    }

    const vanityName = normalizeVanityName(raw);
    if (!vanityName) {
      return new Response(JSON.stringify({ ok: false, error: "vanityName required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("vanity_bluesky_handles")
      .select("did, vanity_name, subdomain, updated_at")
      .eq("vanity_name", vanityName)
      .maybeSingle();

    if (error) {
      console.error("[get-bluesky-did] DB error", error);
      return new Response(JSON.stringify({ ok: false, error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ ok: true, did: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, ...data }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err: any) {
    console.error("[get-bluesky-did] error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
