/**
 * Hook for checking ENS name availability with onchain confirmation
 * Uses the ETH Registrar Controller's available(string) function (authoritative)
 *
 * RELIABILITY FIXES:
 * - Multi-RPC fallback + retries + timeout (prevents random RPC failures)
 * - Controller-first, BaseRegistrar fallback (same logic the controller uses)
 * - Request id guard prevents stale updates during fast typing
 * - Small in-memory cache (TTL) reduces RPC spam
 *
 * ENS reference: ETHRegistrarController.available(string)  [oai_citation:2‡GitHub](https://github.com/ensdomains/ethregistrar/blob/master/contracts/ETHRegistrarController.sol?utm_source=chatgpt.com)
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

const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS_PER_RPC = 2;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
    // Some public RPCs return HTML on overload; guard it.
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`RPC returned non-JSON (${res.status})`);
    }
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

        if (json?.error) throw new Error(json.error.message || "RPC error");
        if (!json?.result) throw new Error("RPC missing result");

        const result = decodeFunctionResult({
          abi: abi as any,
          functionName,
          data: json.result,
        });

        return result as T;
      } catch (e) {
        lastErr = e;
        if (attempt < MAX_ATTEMPTS_PER_RPC) {
          await sleep(200 * attempt + Math.floor(Math.random() * 200));
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
 * 2. Controller.available(label)  (authoritative)  [oai_citation:3‡GitHub](https://github.com/ensdomains/ethregistrar/blob/master/contracts/ETHRegistrarController.sol?utm_source=chatgpt.com)
 * 3. If controller fails (RPC flake), fallback to BaseRegistrar.available(tokenId)
 *    (this matches controller internal logic)  [oai_citation:4‡GitHub](https://github.com/ensdomains/ens-contracts/blob/staging/contracts/ethregistrar/ETHRegistrarController.sol?utm_source=chatgpt.com)
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
          [label], // IMPORTANT: string label (per ENS controller)  [oai_citation:5‡GitHub](https://github.com/ensdomains/ethregistrar/blob/master/contracts/ETHRegistrarController.sol?utm_source=chatgpt.com)
        );
      } catch (e) {
        // 2) Fallback: BaseRegistrar.available(uint256 tokenId)
        // This mirrors controller logic: base.available(uint256(labelhash))  [oai_citation:6‡GitHub](https://github.com/ensdomains/ens-contracts/blob/staging/contracts/ethregistrar/ETHRegistrarController.sol?utm_source=chatgpt.com)
        try {
          isAvailable = await callContract<boolean>(BASE_REGISTRAR, BASE_REGISTRAR_ABI, "available", [tokenId]);
        } catch (e2) {
          // If BOTH fail, bubble to outer catch
          throw e2;
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
    } catch (error) {
      console.error("ENS availability check error:", error);

      if (reqIdRef.current !== reqId) return;

      setResult({
        status: "error",
        name: fullName,
        label,
        error: "Failed to check availability",
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
