/**
 * Hook for checking ENS name availability with onchain confirmation
 * Uses the ETH Registrar Controller's available() function
 *
 * FIXES (reliability):
 * - Uses labelhash (bytes32) for controller.available()  ✅ (string label was wrong / flaky)
 * - Adds multi-RPC fallback + retries + timeout         ✅ (prevents random "Failed to check availability")
 * - Adds simple in-memory cache (TTL)                  ✅ (reduces RPC spam and improves UX)
 * - Adds requestId guard (prevents stale updates)       ✅
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { encodeFunctionData, decodeFunctionResult, keccak256, toBytes } from "viem";
import {
  ETH_REGISTRAR_CONTROLLER,
  ETH_REGISTRAR_CONTROLLER_ABI,
  BASE_REGISTRAR,
  BASE_REGISTRAR_ABI,
  extractLabel,
  validateLabel,
  labelhash as labelhashFromLib,
  labelhashToTokenId,
  yearsToSeconds,
} from "@/lib/ens";

// --- RPC reliability layer ----------------------------------------------------

const RPC_URLS = ["https://eth.llamarpc.com", "https://cloudflare-eth.com", "https://rpc.ankr.com/eth"] as const;

const CALL_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS_PER_RPC = 2;

// tiny cache for availability checks (per tab/session)
const AVAIL_CACHE_TTL_MS = 30_000;
const availCache = new Map<string, { ts: number; value: { isAvailable: boolean; expiry?: bigint } }>();

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
    const json = await res.json();
    return json;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Reliable eth_call:
 * - tries multiple RPCs
 * - retries on transient errors
 */
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
          CALL_TIMEOUT_MS,
        );

        if (json?.error) {
          throw new Error(json.error.message || "RPC error");
        }

        const result = decodeFunctionResult({
          abi: abi as any,
          functionName,
          data: json.result,
        });

        return result as T;
      } catch (e) {
        lastErr = e;

        // small backoff
        if (attempt < MAX_ATTEMPTS_PER_RPC) {
          await sleep(200 * attempt + Math.floor(Math.random() * 150));
          continue;
        }
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("RPC call failed");
}

// --- ENS helpers --------------------------------------------------------------

/**
 * Controller.available() expects bytes32 labelhash, NOT the string label.
 * This is the key fix.
 */
function labelhashBytes32(label: string): `0x${string}` {
  // Prefer your lib if it returns bytes32 hex. If not, compute safely here.
  try {
    const lh = labelhashFromLib(label) as any;
    if (typeof lh === "string" && lh.startsWith("0x") && lh.length === 66) return lh;
  } catch {
    // fall through
  }
  return keccak256(toBytes(label)) as `0x${string}`;
}

export type AvailabilityStatus = "idle" | "loading" | "available" | "taken" | "invalid" | "error";

interface AvailabilityResult {
  status: AvailabilityStatus;
  name: string;
  label: string;
  error?: string;
  expiryDate?: Date;
}

/**
 * Check ENS name availability with onchain confirmation
 *
 * Strategy:
 * 1. Validate the label format
 * 2. Check via ETH Registrar Controller's available(bytes32 labelhash)
 * 3. If taken, get expiry date from Base Registrar via nameExpires(uint256 tokenId)
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

    // Extract label (remove .eth if present)
    const label = extractLabel(query.trim());
    const fullName = `${label}.eth`;

    // Validate the label
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

    setResult({
      status: "loading",
      name: fullName,
      label,
    });

    try {
      // Cache check
      const cacheKey = label.toLowerCase();
      const cached = availCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < AVAIL_CACHE_TTL_MS) {
        if (reqIdRef.current !== reqId) return;

        if (cached.value.isAvailable) {
          setResult({ status: "available", name: fullName, label });
          return;
        }

        const expiry = cached.value.expiry;
        setResult({
          status: "taken",
          name: fullName,
          label,
          expiryDate: expiry && expiry > 0n ? new Date(Number(expiry) * 1000) : undefined,
        });
        return;
      }

      // === ONCHAIN CHECK: ETH Registrar Controller ===
      // IMPORTANT: available(bytes32 labelhash)
      const lh = labelhashBytes32(label);

      const isAvailable = await callContract<boolean>(
        ETH_REGISTRAR_CONTROLLER,
        ETH_REGISTRAR_CONTROLLER_ABI,
        "available",
        [lh],
      );

      if (reqIdRef.current !== reqId) return;

      if (isAvailable) {
        availCache.set(cacheKey, { ts: Date.now(), value: { isAvailable: true } });
        setResult({
          status: "available",
          name: fullName,
          label,
        });
        return;
      }

      // Name is taken - get expiry date from Base Registrar
      let expiry: bigint | undefined;

      try {
        const tokenId = labelhashToTokenId(lh);

        const expiryBn = await callContract<bigint>(BASE_REGISTRAR, BASE_REGISTRAR_ABI, "nameExpires", [tokenId]);

        expiry = expiryBn;
      } catch (e) {
        // expiry fetch is a nice-to-have; don't fail the whole check
        console.warn("Failed to fetch expiry date:", e);
      }

      if (reqIdRef.current !== reqId) return;

      availCache.set(cacheKey, {
        ts: Date.now(),
        value: { isAvailable: false, expiry },
      });

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
 * NOTE: rentPrice expects (string name, uint256 duration) on ETHRegistrarController.
 * This stays as you had it.
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
