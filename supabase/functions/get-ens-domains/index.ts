import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Primary ENS subgraph endpoint (public; rate-limits often)
const ENS_SUBGRAPH_URL =
  (Deno.env.get("ENS_SUBGRAPH_URL") || "").trim() || "https://api.thegraph.com/subgraphs/name/ensdomains/ens";

// Optional fallback endpoint (HIGHLY recommended).
// Example (The Graph Gateway): https://gateway.thegraph.com/api/<KEY>/subgraphs/id/<SUBGRAPH_ID>
const ENS_SUBGRAPH_URL_FALLBACK = (Deno.env.get("ENS_SUBGRAPH_URL_FALLBACK") || "").trim();

// Simple in-memory cache per edge instance
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { ts: number; payload: { domains: any[]; count: number; error?: string } }>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postJsonWithRetry(
  url: string,
  body: unknown,
  opts: { maxAttempts?: number; timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data?: any; text?: string; error?: string }> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const timeoutMs = opts.timeoutMs ?? 12_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await res.text();
      clearTimeout(timeout);

      // retry on 429 or transient 5xx
      const shouldRetry = res.status === 429 || (res.status >= 500 && res.status <= 599);
      if (shouldRetry && attempt < maxAttempts) {
        const backoff = 350 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 250);
        await sleep(backoff + jitter);
        continue;
      }

      if (!res.ok) {
        return { ok: false, status: res.status, text, error: `Subgraph error: ${res.status}` };
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return { ok: false, status: 502, text, error: "Subgraph error: invalid JSON" };
      }

      // TheGraph can return 200 with errors[] in payload
      if (data?.errors?.length) {
        const msg = String(data.errors?.[0]?.message ?? "Subgraph query error");
        if (/429|rate|too many/i.test(msg)) {
          return { ok: false, status: 429, data, error: "Subgraph error: 429" };
        }
        return { ok: false, status: 502, data, error: `Subgraph error: ${msg}` };
      }

      return { ok: true, status: 200, data };
    } catch (e: any) {
      clearTimeout(timeout);

      if (attempt < maxAttempts) {
        const backoff = 350 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 250);
        await sleep(backoff + jitter);
        continue;
      }

      return {
        ok: false,
        status: 0,
        error: e?.message ? `Subgraph fetch failed: ${e.message}` : "Subgraph fetch failed",
      };
    }
  }

  return { ok: false, status: 0, error: "Unknown subgraph failure" };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = String(body?.walletAddress ?? "").trim();

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return jsonResponse({
        domains: [],
        wrappedDomains: [],
        allDomains: [],
        count: 0,
        error: "No valid wallet address provided",
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const cacheKey = `ens-domains:${normalizedAddress}`;

    // Cache hit
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return jsonResponse(cached.payload);
    }

    console.log("🔍 Fetching ENS domains for:", normalizedAddress);

    const graphqlQuery = {
      query: `
        query GetUserDomains($address: String!) {
          domains(
            first: 100
            orderBy: createdAt
            orderDirection: desc
            where: { owner: $address }
          ) {
            id
            name
            labelName
            labelhash
            owner { id }
            createdAt
            expiryDate
          }
          wrappedDomains(
            first: 100
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
            first: 50
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

    console.log("📤 Querying ENS subgraph...");

    // Primary attempt
    let resp = await postJsonWithRetry(ENS_SUBGRAPH_URL, graphqlQuery);

    // If rate-limited and fallback exists, try fallback
    if (!resp.ok && resp.status === 429 && ENS_SUBGRAPH_URL_FALLBACK) {
      console.warn("⚠️ Primary ENS subgraph rate-limited. Trying fallback...");
      resp = await postJsonWithRetry(ENS_SUBGRAPH_URL_FALLBACK, graphqlQuery);
    }

    // If still failing, FAIL GRACEFULLY (return 200) so UI never hard-crashes
    if (!resp.ok) {
      console.error("❌ ENS Subgraph error:", resp.status, resp.error);

      const payload = {
        domains: [],
        wrappedDomains: [],
        allDomains: [],
        count: 0,
        error: resp.error || "Subgraph error",
      };

      // Cache the empty result briefly to reduce hammering
      cache.set(cacheKey, { ts: Date.now(), payload });

      return jsonResponse(payload);
    }

    const data = resp.data;
    console.log("✅ ENS Subgraph response received");

    const domains = data?.data?.domains || [];
    const wrappedDomains = data?.data?.wrappedDomains || [];
    const resolvedDomains = data?.data?.resolvedDomains || [];

    console.log(
      `📊 Found ${domains.length} owned domains, ${wrappedDomains.length} wrapped domains, ${resolvedDomains.length} resolved domains`,
    );

    // Merge and deduplicate all domains
    const domainMap = new Map<string, any>();

    // Add owned domains
    domains.forEach((d: any) => {
      if (d?.name && !String(d.name).startsWith("[")) {
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

    // Add wrapped domains (v3 wrapped names)
    wrappedDomains.forEach((d: any) => {
      if (d?.name && !String(d.name).startsWith("[")) {
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

    // Add resolved domains (names pointing to this address)
    resolvedDomains.forEach((d: any) => {
      if (d?.name && !String(d.name).startsWith("[")) {
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
      wrappedDomains,
      allDomains,
      count: formattedDomains.length,
    };

    cache.set(cacheKey, { ts: Date.now(), payload });

    return jsonResponse(payload);
  } catch (error) {
    console.error("❌ Error fetching ENS domains:", error);

    // IMPORTANT: return 200 (not 500) so your UI doesn’t blank-screen
    return jsonResponse({
      domains: [],
      wrappedDomains: [],
      allDomains: [],
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
