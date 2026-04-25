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
 * Fetches Unstoppable Domains community badges by domain or by wallet address.
 *
 * Body: { domain?: string } | { address?: string }
 *
 * Endpoints:
 *   GET https://api.unstoppabledomains.com/profile/public/{domain|address}/badges
 *
 * Always returns 200 with `{ badges: [...] }` (graceful on upstream failure).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const domainCandidates = [
      body?.domain,
      Array.isArray(body?.domains) ? body.domains[0] : undefined,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);
    const addressCandidates = [
      body?.address,
      Array.isArray(body?.addresses) ? body.addresses[0] : undefined,
      body?.walletAddress,
      body?.wallet,
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

    const lookups: string[] = [];
    for (const rawDomain of domainCandidates) {
      if (rawDomain.includes(".")) lookups.push(rawDomain);
    }
    for (const rawAddress of addressCandidates) {
      if (/^0x[a-fA-F0-9]{40}$/.test(rawAddress)) {
        lookups.push(rawAddress.toLowerCase());
      }
    }

    if (lookups.length === 0) {
      return new Response(
        JSON.stringify({ badges: [], reason: "invalid-input" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let badges: any[] = [];
    let usedLookup: string | null = null;
    let lastStatus: number | null = null;

    for (const key of lookups) {
      const url = `https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(key)}/badges`;
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        lastStatus = res.status;

        if (!res.ok) {
          console.warn("[get-ud-badges] Upstream non-OK", { key, status: res.status });
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
        // Empty array from this key — try next lookup
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
      }),
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
