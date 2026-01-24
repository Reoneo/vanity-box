import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Prefer env vars so you can move to a Graph gateway endpoint later (recommended).
// If not set, it will fall back to your current public endpoint.
const ENS_SUBGRAPH_URL =
  (Deno.env.get("ENS_SUBGRAPH_URL") || "").trim() || "https://api.thegraph.com/subgraphs/name/ensdomains/ens";

// Optional fallback (set this in Supabase secrets if you have a gateway endpoint)
// Example: https://gateway.thegraph.com/api/<KEY>/subgraphs/id/<ID>
const ENS_SUBGRAPH_URL_FALLBACK = (Deno.env.get("ENS_SUBGRAPH_URL_FALLBACK") || "").trim();

type DomainRow = {
  id?: string;
  name?: string;
  labelName?: string | null;
  labelhash?: string | null;
  owner?: { id?: string } | null;
  createdAt?: string | null;
  expiryDate?: string | null;
};

type WrappedDomainRow = {
  id?: string;
  name?: string;
  expiryDate?: string | null;
  owner?: { id?: string } | null;
};

type EnsDomainOut = {
  identifier: string;
  name: string;
  collection: string;
  image_url: string;
  display_image_url: string;
  type: "owned" | "wrapped" | "resolved";
  expiryDate?: string | null;
  createdAt?: string | null;
  chain: "ethereum";
  isEnsDomain: true;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function isEvmAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * In-memory cache (per Edge instance) to reduce subgraph calls.
 * This is not a global persistent cache, but it helps a lot in practice.
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { ts: number; value: { domains: EnsDomainOut[]; count: number; error?: string } }>();

async function fetchWithRetry(
  url: string,
  payload: unknown,
  opts: { maxAttempts?: number; timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; text: string }> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const timeoutMs = opts.timeoutMs ?? 12_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await res.text();
      clearTimeout(timeout);

      // Retry on 429 or transient 5xx
      const shouldRetry = res.status === 429 || (res.status >= 500 && res.status <= 599);
      if (shouldRetry && attempt < maxAttempts) {
        const backoff = 350 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 250);
        await sleep(backoff + jitter);
        continue;
      }

      return { ok: res.ok, status: res.status, text };
    } catch (e) {
      clearTimeout(timeout);

      if (attempt < maxAttempts) {
        const backoff = 350 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 250);
        await sleep(backoff + jitter);
        continue;
      }

      return { ok: false, status: 0, text: String((e as any)?.message ?? e) };
    }
  }

  return { ok: false, status: 0, text: "Unknown error" };
}

const graphqlQuery = `
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
`;

function buildFormattedDomains(allDomains: any[]): EnsDomainOut[] {
  return allDomains.map((d: any) => {
    const n = String(d.name);
    const avatar = `https://metadata.ens.domains/mainnet/avatar/${n}`;
    return {
      identifier: n,
      name: n,
      collection: "ENS Domains",
      image_url: avatar,
      display_image_url: avatar,
      type: d.type,
      expiryDate: d.expiryDate ?? null,
      createdAt: d.createdAt ?? null,
      chain: "ethereum",
      isEnsDomain: true,
    };
  });
}

function mergeAndDedupe(domains: DomainRow[], wrapped: WrappedDomainRow[], resolved: DomainRow[]) {
  const domainMap = new Map<string, any>();

  // Owned
  domains.forEach((d) => {
    if (d?.name && !String(d.name).startsWith("[")) {
      domainMap.set(d.name, {
        name: d.name,
        labelName: d.labelName,
        type: "owned" as const,
        createdAt: d.createdAt,
        expiryDate: d.expiryDate,
        owner: d.owner?.id,
      });
    }
  });

  // Wrapped (overwrite/augment)
  wrapped.forEach((d) => {
    if (d?.name && !String(d.name).startsWith("[")) {
      const existing = domainMap.get(d.name) || {};
      domainMap.set(d.name, {
        ...existing,
        name: d.name,
        type: "wrapped" as const,
        expiryDate: d.expiryDate,
        owner: d.owner?.id ?? existing.owner,
      });
    }
  });

  // Resolved (only add if not already owned/wrapped)
  resolved.forEach((d) => {
    if (d?.name && !String(d.name).startsWith("[")) {
      if (!domainMap.has(d.name)) {
        domainMap.set(d.name, {
          name: d.name,
          labelName: d.labelName,
          type: "resolved" as const,
          createdAt: d.createdAt,
          expiryDate: d.expiryDate,
          owner: d.owner?.id,
        });
      }
    }
  });

  return Array.from(domainMap.values());
}

async function querySubgraph(endpoint: string, address: string) {
  const payload = {
    query: graphqlQuery,
    variables: { address },
  };

  const r = await fetchWithRetry(endpoint, payload, { maxAttempts: 4, timeoutMs: 12_000 });

  // If we got 429, return a clear signal so caller can try fallback
  if (r.status === 429) {
    return { ok: false, status: 429, error: "Subgraph error: 429", data: null as any };
  }

  if (!r.ok) {
    // Non-OK: return readable error (don’t throw)
    const msg = r.status
      ? `Subgraph error: ${r.status}`
      : `Subgraph fetch failed: ${r.text?.slice(0, 120) || "unknown"}`;
    return { ok: false, status: r.status || 0, error: msg, data: null as any };
  }

  let jsonData: any;
  try {
    jsonData = JSON.parse(r.text);
  } catch {
    return { ok: false, status: 502, error: "Subgraph error: invalid JSON", data: null as any };
  }

  if (jsonData?.errors?.length) {
    const msg = String(jsonData.errors?.[0]?.message ?? "Subgraph query error");
    if (/429|rate|too many/i.test(msg)) {
      return { ok: false, status: 429, error: "Subgraph error: 429", data: null as any };
    }
    return { ok: false, status: 502, error: `Subgraph error: ${msg}`, data: null as any };
  }

  return { ok: true, status: 200, error: "", data: jsonData?.data ?? {} };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = String(body?.walletAddress ?? "").trim();

    if (!walletAddress || !isEvmAddress(walletAddress)) {
      return json({
        domains: [],
        wrappedDomains: [],
        allDomains: [],
        count: 0,
        error: "No valid wallet address provided",
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const cacheKey = `ens:${normalizedAddress}`;

    // Cache hit
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return json(cached.value);
    }

    console.log("🔍 Fetching ENS domains for:", normalizedAddress);
    console.log("📤 Querying ENS subgraph...");

    // Primary attempt
    let result = await querySubgraph(ENS_SUBGRAPH_URL, normalizedAddress);

    // If 429 and fallback exists, try fallback
    if (!result.ok && result.status === 429 && ENS_SUBGRAPH_URL_FALLBACK) {
      console.warn("⚠️ Primary subgraph rate limited. Trying fallback...");
      result = await querySubgraph(ENS_SUBGRAPH_URL_FALLBACK, normalizedAddress);
    }

    // If still not ok, FAIL GRACEFULLY with HTTP 200 (prevents blank-screen)
    if (!result.ok) {
      console.error("❌ ENS Subgraph error:", result.status, result.error);

      const payload = {
        domains: [],
        wrappedDomains: [],
        allDomains: [],
        count: 0,
        error: result.error || "Subgraph error",
      };

      cache.set(cacheKey, { ts: Date.now(), value: payload }); // cache empty briefly to reduce spam
      return json(payload);
    }

    console.log("✅ ENS Subgraph response received");

    const domains: DomainRow[] = result.data?.domains || [];
    const wrappedDomains: WrappedDomainRow[] = result.data?.wrappedDomains || [];
    const resolvedDomains: DomainRow[] = result.data?.resolvedDomains || [];

    console.log(
      `📊 Found ${domains.length} owned domains, ${wrappedDomains.length} wrapped domains, ${resolvedDomains.length} resolved domains`,
    );

    const allDomains = mergeAndDedupe(domains, wrappedDomains, resolvedDomains);
    console.log(`✅ Total unique domains: ${allDomains.length}`);

    const formattedDomains = buildFormattedDomains(allDomains);

    const payload = {
      domains: formattedDomains,
      wrappedDomains,
      allDomains,
      count: formattedDomains.length,
    };

    // Cache success
    cache.set(cacheKey, { ts: Date.now(), value: payload });

    return json(payload);
  } catch (error) {
    // CRITICAL: don’t return 500 here — return 200 so UI never blank-screens
    console.error("❌ Error fetching ENS domains:", error);

    return json({
      domains: [],
      wrappedDomains: [],
      allDomains: [],
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
