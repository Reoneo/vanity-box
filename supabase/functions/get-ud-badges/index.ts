import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

interface UdBadge {
  code: string;
  name: string;
  logo: string;
  linkUrl?: string;
  description?: string;
  status?: string;
  count?: number;
  type?: string;
  active?: boolean;
}

/**
 * Fetches Unstoppable Domains community badges for a given UD-style domain.
 *
 * Endpoint reference:
 *   GET https://api.unstoppabledomains.com/profile/public/{domain}/badges
 *
 * Returns: { badges: UdBadge[] } — only `approved`/`active` badges are returned.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const domain = String(body?.domain ?? "").trim().toLowerCase();

    if (!domain || !domain.includes(".")) {
      return new Response(
        JSON.stringify({ badges: [], reason: "invalid-domain" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = `https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(domain)}/badges`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn("[get-ud-badges] Upstream non-OK", { domain, status: res.status });
      return new Response(JSON.stringify({ badges: [], status: res.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const rawBadges: UdBadge[] = Array.isArray(data?.badges) ? data.badges : [];

    const badges = rawBadges
      .filter((b) => b && b.active !== false && b.status !== "rejected")
      .map((b) => ({
        code: b.code,
        name: b.name,
        logo: b.logo,
        description: b.description ?? "",
        linkUrl: b.linkUrl ?? "",
        count: typeof b.count === "number" ? b.count : null,
        type: b.type ?? "",
      }));

    return new Response(
      JSON.stringify({ badges, total: badges.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("[get-ud-badges] error", e);
    return new Response(
      JSON.stringify({ badges: [], error: String(e?.message ?? e) }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
