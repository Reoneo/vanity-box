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
 * Fetches Unstoppable Domains community badges.
 *
 * Body: { domain?: string, domains?: string[] }
 *
 * Note: UD's public badges endpoint only accepts DOMAIN inputs (not raw addresses).
 * Pass every known UD-style identity for the user; the first one that returns badges wins.
 *
 * Endpoint:
 *   GET https://api.unstoppabledomains.com/profile/public/{domain}/badges
 *
 * Always returns 200 with `{ badges: [...] }` (graceful on upstream failure).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const candidates: string[] = [];
    const pushDomain = (raw: unknown) => {
      const s = String(raw ?? "").trim().toLowerCase();
      if (s && s.includes(".") && !/^0x[a-f0-9]{40}$/.test(s) && !candidates.includes(s)) {
        candidates.push(s);
      }
    };
    pushDomain(body?.domain);
    if (Array.isArray(body?.domains)) body.domains.forEach(pushDomain);

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ badges: [], reason: "no-domain-candidates" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let badges: any[] = [];
    let usedLookup: string | null = null;
    let lastStatus: number | null = null;

    for (const key of candidates) {
      const url = `https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(key)}/badges`;
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        lastStatus = res.status;

        if (!res.ok) {
          console.warn("[get-ud-badges] non-OK", { key, status: res.status });
          continue;
        }

        const data = await res.json();
        const rawBadges: UdBadge[] = Array.isArray(data?.badges) ? data.badges : [];

        const normalized = rawBadges
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

        if (normalized.length > 0) {
          badges = normalized;
          usedLookup = key;
          break;
        }
        if (!usedLookup) usedLookup = key;
      } catch (innerErr) {
        console.warn("[get-ud-badges] fetch error", { key, error: String(innerErr) });
      }
    }

    return new Response(
      JSON.stringify({
        badges,
        total: badges.length,
        usedLookup,
        status: lastStatus,
        triedCandidates: candidates,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[get-ud-badges] error", e);
    return new Response(
      JSON.stringify({ badges: [], error: String((e as any)?.message ?? e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
