import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default ENS subgraph (free/public) — prone to 429 under load.
const DEFAULT_ENS_SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/ensdomains/ens";

/**
 * Optional: set ENS_SUBGRAPH_URLS as comma-separated list to rotate/fallback:
 * ENS_SUBGRAPH_URLS="https://api.thegraph.com/subgraphs/name/ensdomains/ens,https://another-endpoint"
 */
const SUBGRAPH_URLS = (Deno.env.get("ENS_SUBGRAPH_URLS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ENS_SUBGRAPH_URLS = SUBGRAPH_URLS.length > 0 ? SUBGRAPH_URLS : [DEFAULT_ENS_SUBGRAPH_URL];

// --- Small in-memory cache to reduce subgraph calls ---
// Note: Edge isolates can reuse memory between requests (best-effort).
type CacheEntry = { ts: number; payload: any };
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.payload;
}

function cacheSet(key: string, payload: any) {
  cache.set(key, { ts: Date.now(), payload });
}

// Sleep helper
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch with timeout
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GraphQL POST with:
 * - multi-endpoint fallback
 * - retries on 429/5xx
 */
async function postGraphQLWithFallback(
  urls: string[],
  body: unknown,
  opts?: {
    maxRetriesPerUrl?: number;
    timeoutMs?: number;
    baseDelayMs?: number;
  },
): Promise<{
  ok: boolean;
  status: number;
  urlTried: string;
  json?: any;
  text?: string;
  retryAfterSeconds?: number | null;
  rateLimited?: boolean;
}> {
  const maxRetriesPerUrl = opts?.maxRetriesPerUrl ?? 3;
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  const baseDelayMs = opts?.baseDelayMs ?? 500;

  let last: any = null;

  for (const url of urls) {
    for (let attempt = 0; attempt <= maxRetriesPerUrl; attempt++) {
      try {
        const res = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          timeoutMs,
        );

        // Success
        if (res.ok) {
          const json = await res.json().catch(() => null);
          return { ok: true, status: res.status, urlTried: url, json };
        }

        const status = res.status;
        const text = await res.text().catch(() => "");

        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;

        // Retry on 429 + 5xx
        const shouldRetry = status === 429 || status >= 500;

        last = {
          ok: false,
          status,
          urlTried: url,
          text,
          retryAfterSeconds,
          rateLimited: status === 429,
        };

        if (!shouldRetry || attempt === maxRetriesPerUrl) {
          // Stop retrying this URL, fall through to next URL
          break;
        }

        // Exponential backoff with jitter
        const exp = Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 250);
        const delay =
          (retryAfterSeconds && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : baseDelayMs * exp) + jitter;

        console.warn(
          `⚠️ Subgraph retry ${attempt + 1}/${maxRetriesPerUrl} for ${url} - status ${status}. Waiting ${delay}ms`,
        );
        await sleep(delay);
      } catch (err: any) {
        last = {
          ok: false,
          status: 0,
          urlTried: url,
          text: err?.message || String(err),
          retryAfterSeconds: null,
          rateLimited: false,
        };

        // Retry network/timeout errors a couple times
        if (attempt === maxRetriesPerUrl) break;

        const exp = Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 250);
        const delay = baseDelayMs * exp + jitter;

        console.warn(`⚠️ Subgraph network retry ${attempt + 1}/${maxRetriesPerUrl} for ${url}. Waiting ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  return (
    last || {
      ok: false,
      status: 0,
      urlTried: urls[0],
      text: "Unknown error",
      retryAfterSeconds: null,
      rateLimited: false,
    }
  );
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      console.log("❌ No valid wallet address provided");
      return new Response(
        JSON.stringify({
          domains: [],
          wrappedDomains: [],
          allDomains: [],
          error: "No wallet address provided",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();
    console.log("🔍 Fetching ENS domains for:", normalizedAddress);

    // Cache hit?
    const cacheKey = `ens-domains:${normalizedAddress}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      console.log("⚡ Returning cached ENS domains");
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reduce query size slightly to avoid heavy loads
    const graphqlQuery = {
      query: `
        query GetUserDomains($address: String!) {
          domains(
            first: 50
            orderBy: createdAt
            orderDirection: desc
            where: { owner: $address }
          ) {
            id
            name
            labelName
            owner { id }
            createdAt
            expiryDate
          }
          wrappedDomains(
            first: 50
            orderBy: expiryDate
            orderDirection: desc
            where: { owner: $address }
          ) {
            id
            name
            expiryDate
            owner { id }
          }
          resolvedDomains: domains(
            first: 25
            orderBy: createdAt
            orderDirection: desc
            where: { resolvedAddress: $address }
          ) {
            id
            name
            labelName
            owner { id }
            createdAt
            expiryDate
          }
        }
      `,
      variables: { address: normalizedAddress },
    };

    console.log("📤 Querying ENS subgraph...", ENS_SUBGRAPH_URLS);

    const subgraph = await postGraphQLWithFallback(ENS_SUBGRAPH_URLS, graphqlQuery, {
      maxRetriesPerUrl: 3,
      timeoutMs: 12_000,
      baseDelayMs: 600,
    });

    // If we got rate limited / failed, DO NOT 500 (prevents blank screen)
    if (!subgraph.ok) {
      console.error("❌ ENS Subgraph failed:", subgraph.status, subgraph.text, "url:", subgraph.urlTried);

      const payload = {
        domains: [],
        count: 0,
        error:
          subgraph.status === 429
            ? "Subgraph rate limited (429). Try again shortly."
            : `Subgraph error: ${subgraph.status || "network"}`,
        rateLimited: subgraph.status === 429,
        retryAfterSeconds: subgraph.retryAfterSeconds ?? null,
      };

      // Cache the empty result briefly to avoid hammering on refresh loops
      cacheSet(cacheKey, payload);

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = subgraph.json;
    console.log("✅ ENS Subgraph response received from:", subgraph.urlTried);

    // Some GraphQL responses include errors[] even with 200
    if (data?.errors?.length) {
      console.error("❌ ENS Subgraph GraphQL errors:", data.errors);
      const payload = {
        domains: [],
        count: 0,
        error: "Subgraph GraphQL error",
        details: data.errors,
      };
      cacheSet(cacheKey, payload);
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domains = data?.data?.domains || [];
    const wrappedDomains = data?.data?.wrappedDomains || [];
    const resolvedDomains = data?.data?.resolvedDomains || [];

    console.log(
      `📊 Found ${domains.length} owned, ${wrappedDomains.length} wrapped, ${resolvedDomains.length} resolved`,
    );

    // Merge and dedupe
    const domainMap = new Map<string, any>();

    domains.forEach((d: any) => {
      if (d.name && !d.name.startsWith("[")) {
        domainMap.set(d.name, {
          name: d.name,
          labelName: d.labelName,
          type: "owned",
          createdAt: d.createdAt,
          expiryDate: d.expiryDate,
          owner: d.owner?.id,
        });
      }
    });

    wrappedDomains.forEach((d: any) => {
      if (d.name && !d.name.startsWith("[")) {
        const existing = domainMap.get(d.name);
        domainMap.set(d.name, {
          ...existing,
          name: d.name,
          type: "wrapped",
          expiryDate: d.expiryDate,
          owner: d.owner?.id,
        });
      }
    });

    resolvedDomains.forEach((d: any) => {
      if (d.name && !d.name.startsWith("[")) {
        const existing = domainMap.get(d.name);
        if (!existing) {
          domainMap.set(d.name, {
            name: d.name,
            labelName: d.labelName,
            type: "resolved",
            createdAt: d.createdAt,
            expiryDate: d.expiryDate,
            owner: d.owner?.id,
          });
        }
      }
    });

    const allDomains = Array.from(domainMap.values());
    console.log(`✅ Total unique domains: ${allDomains.length}`);

    const formattedDomains = allDomains.map((d: any) => ({
      identifier: d.name,
      name: d.name,
      collection: "ENS Domains",
      image_url: `https://metadata.ens.domains/mainnet/avatar/${d.name}`,
      display_image_url: `https://metadata.ens.domains/mainnet/avatar/${d.name}`,
      type: d.type,
      expiryDate: d.expiryDate,
      createdAt: d.createdAt,
      chain: "ethereum",
      isEnsDomain: true,
    }));

    const payload = {
      domains: formattedDomains,
      count: formattedDomains.length,
    };

    // Cache successful result
    cacheSet(cacheKey, payload);

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Error fetching ENS domains:", error);

    // Also avoid hard 500 where possible to prevent blank screen
    return new Response(
      JSON.stringify({
        domains: [],
        count: 0,
        error: error?.message || "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
