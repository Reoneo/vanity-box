/**
 * Hook for checking ENS name availability with onchain confirmation
 * Uses the ETH Registrar Controller's available(string) function (authoritative)
 *
 * RELIABILITY FIXES (updated):
 * - Better error reporting (you'll see the real error, not just "Failed to check availability")
 * - Multi-RPC fallback + retries + timeout
 * - Controller-first, BaseRegistrar fallback (same logic the controller uses)
 * - Request id guard prevents stale updates during fast typing
 * - Small in-memory cache (TTL) reduces RPC spam
 * - Safer JSON-RPC parsing (handles HTML / empty / malformed responses)
 *
 * IMPORTANT:
 * If you STILL see errors after this, it means the browser can't reach public RPCs reliably
 * (CORS, rate-limit, mobile network). Then you should move availability checks to a Supabase Edge
 * function like we discussed.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { encodeFunctionData, decodeFunctionResult } from "viem";
import {
  ETH_REGISTRAR_CONTROLLER,
  ETH_REGISTRAR_CONTROLLER_ABI,
  BASE_REGISTRAR,
  BASE_REGISTRAR_ABI,
  extractLabel,
  validateLabel,
  labelhash,
  labelhashToTokenId,
  yearsToSeconds,
} from "@/lib/ens";

// ---- RPC layer ---------------------------------------------------------------

const RPC_URLS = ["https://eth.llamarpc.com", "https://cloudflare-eth.com", "https://rpc.ankr.com/eth"] as const;

const TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS_PER_RPC = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeTruncate(s: string, n = 180) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function fetchJsonWithTimeout(url: string, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();

    // Some public RPCs return HTML or empty body on overload.
    if (!text) {
      throw new Error(`RPC empty response (${res.status}) from ${url}`);
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      // Helps you diagnose CORS / WAF / HTML responses
      throw new Error(`RPC non-JSON (${res.status}) from ${url}: ${safeTruncate(text)}`);
    }

    if (!res.ok) {
      // Sometimes errors are still returned as JSON
      const msg = json?.error?.message ? String(json.error.message) : `HTTP ${res.status}`;
      throw new Error(`RPC HTTP error from ${url}: ${msg}`);
    }

    return json;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`RPC timeout after ${timeoutMs}ms: ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// Use fetch-based approach for reliable contract reads (now with retry + fallback)
async function callContract<T>(
  address: string,
  abi: readonly any[],
  functionName: string,
  args: any[] = [],
): Promise<T> {
  const data = encodeFunctionData({
    abi: abi as any,
    functionName,
    args,
  });

  let lastErr: unknown = null;

  for (const rpc of RPC_URLS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_RPC; attempt++) {
      try {
        const json = await fetchJsonWithTimeout(
          rpc,
          {
            jsonrpc: "2.0",
            id: Date.now(),
            method: "eth_call",
            params: [{ to: address, data }, "latest"],
          },
          TIMEOUT_MS,
        );

        if (json?.error) {
          throw new Error(`RPC error from ${rpc}: ${json.error.message || "Unknown RPC error"}`);
        }
        if (!json?.result) {
          throw new Error(`RPC missing result from ${rpc}`);
        }

        try {
          const result = decodeFunctionResult({
            abi: abi as any,
            functionName,
            data: json.result,
          });

          return result as T;
        } catch (decodeErr: any) {
          // ABI mismatch / wrong return type / wrong contract address
          throw new Error(`Decode failed for ${functionName} via ${rpc}: ${decodeErr?.message || String(decodeErr)}`);
        }
      } catch (e) {
        lastErr = e;

        // backoff & retry
        if (attempt < MAX_ATTEMPTS_PER_RPC) {
          await sleep(250 * attempt + Math.floor(Math.random() * 250));
          continue;
        }
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("RPC call failed");
}

// ---- Availability cache ------------------------------------------------------

export type AvailabilityStatus = "idle" | "loading" | "available" | "taken" | "invalid" | "error";

interface AvailabilityResult {
  status: AvailabilityStatus;
  name: string;
  label: string;
  error?: string;
  expiryDate?: Date;
}

const AVAIL_CACHE_TTL_MS = 30_000;
const availCache = new Map<string, { ts: number; value: { status: "available" | "taken"; expiry?: bigint } }>();

/**
 * Check ENS name availability with onchain confirmation
 *
 * Strategy:
 * 1. Validate label
 * 2. Controller.available(label) (authoritative)
 * 3. If controller fails (RPC flake), fallback to BaseRegistrar.available(tokenId)
 * 4. If taken, fetch expiry using BaseRegistrar.nameExpires(tokenId)
 */
export function useEnsAvailability(searchQuery: string): AvailabilityResult {
  const [result, setResult] = useState<AvailabilityResult>({
    status: "idle",
    name: "",
    label: "",
  });

  const reqIdRef = useRef(0);

  const checkAvailability = useCallback(async (query: string) => {
    const reqId = ++reqIdRef.current;

    // Skip if empty
    if (!query || query.trim().length === 0) {
      setResult({ status: "idle", name: "", label: "" });
      return;
    }

    const label = extractLabel(query.trim());
    const fullName = `${label}.eth`;

    const validation = validateLabel(label);
    if (!validation.valid) {
      setResult({
        status: "invalid",
        name: fullName,
        label,
        error: validation.error,
      });
      return;
    }

    // Cache hit
    const cacheKey = label.toLowerCase();
    const cached = availCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < AVAIL_CACHE_TTL_MS) {
      if (cached.value.status === "available") {
        setResult({ status: "available", name: fullName, label });
        return;
      }
      setResult({
        status: "taken",
        name: fullName,
        label,
        expiryDate:
          cached.value.expiry && cached.value.expiry > 0n ? new Date(Number(cached.value.expiry) * 1000) : undefined,
      });
      return;
    }

    setResult({ status: "loading", name: fullName, label });

    try {
      // Compute tokenId for BaseRegistrar calls
      const lh = labelhash(label);
      const tokenId = labelhashToTokenId(lh);

      // 1) Controller-first (authoritative)
      let isAvailable: boolean | null = null;

      try {
        isAvailable = await callContract<boolean>(
          ETH_REGISTRAR_CONTROLLER,
          ETH_REGISTRAR_CONTROLLER_ABI,
          "available",
          [label], // string label
        );
      } catch (controllerErr: any) {
        // 2) Fallback: BaseRegistrar.available(uint256 tokenId)
        try {
          isAvailable = await callContract<boolean>(BASE_REGISTRAR, BASE_REGISTRAR_ABI, "available", [tokenId]);
        } catch (baseErr: any) {
          // If both fail, surface the most useful combined message
          const msg = `Controller+BaseRegistrar failed. Controller: ${
            controllerErr?.message || String(controllerErr)
          } | Base: ${baseErr?.message || String(baseErr)}`;
          throw new Error(msg);
        }
      }

      // Ignore stale response
      if (reqIdRef.current !== reqId) return;

      if (isAvailable) {
        availCache.set(cacheKey, { ts: Date.now(), value: { status: "available" } });
        setResult({ status: "available", name: fullName, label });
        return;
      }

      // Taken: get expiry date
      let expiry: bigint | undefined;
      try {
        const expiryBn = await callContract<bigint>(BASE_REGISTRAR, BASE_REGISTRAR_ABI, "nameExpires", [tokenId]);
        expiry = expiryBn;
      } catch (e) {
        // expiry is nice-to-have; do not fail availability
        console.warn("Failed to fetch expiry date:", e);
      }

      if (reqIdRef.current !== reqId) return;

      availCache.set(cacheKey, { ts: Date.now(), value: { status: "taken", expiry } });

      setResult({
        status: "taken",
        name: fullName,
        label,
        expiryDate: expiry && expiry > 0n ? new Date(Number(expiry) * 1000) : undefined,
      });
    } catch (error: any) {
      console.error("ENS availability check error:", error);

      if (reqIdRef.current !== reqId) return;

      // KEY CHANGE: show REAL error so you can diagnose (CORS, timeout, decode, etc.)
      setResult({
        status: "error",
        name: fullName,
        label,
        error: error?.message || String(error) || "Failed to check availability",
      });
    }
  }, []);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, checkAvailability]);

  return result;
}

/**
 * Get rent price for a name + duration
 */
export async function getEnsRentPrice(
  label: string,
  durationYears: number,
): Promise<{ base: bigint; premium: bigint; total: bigint }> {
  const durationSeconds = yearsToSeconds(durationYears);

  const price = await callContract<{ base: bigint; premium: bigint }>(
    ETH_REGISTRAR_CONTROLLER,
    ETH_REGISTRAR_CONTROLLER_ABI,
    "rentPrice",
    [label, durationSeconds],
  );

  return {
    base: price.base,
    premium: price.premium,
    total: price.base + price.premium,
  };
}

/**
 * Get minimum commitment age (wait time after commit)
 */
export async function getMinCommitmentAge(): Promise<number> {
  const age = await callContract<bigint>(
    ETH_REGISTRAR_CONTROLLER,
    ETH_REGISTRAR_CONTROLLER_ABI,
    "minCommitmentAge",
    [],
  );
  return Number(age);
}

/**
 * Get maximum commitment age (commitment expiry)
 */
export async function getMaxCommitmentAge(): Promise<number> {
  const age = await callContract<bigint>(
    ETH_REGISTRAR_CONTROLLER,
    ETH_REGISTRAR_CONTROLLER_ABI,
    "maxCommitmentAge",
    [],
  );
  return Number(age);
}

/**
 * Check if a commitment is valid (has been submitted and is in valid time window)
 */
export async function getCommitmentTimestamp(commitment: `0x${string}`): Promise<number> {
  const timestamp = await callContract<bigint>(ETH_REGISTRAR_CONTROLLER, ETH_REGISTRAR_CONTROLLER_ABI, "commitments", [
    commitment,
  ]);
  return Number(timestamp);
}
