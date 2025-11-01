// src/lib/minikit.ts
import { MiniKit, ResponseEvent, MiniAppPaymentPayload, Tokens, PayCommandInput } from "@worldcoin/minikit-js";

let initPromise: Promise<void> | null = null;
let isReady = false;

/**
 * Initialize MiniKit once on app load
 */
export function initMiniKit(appId: string): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      MiniKit.install(appId);
      isReady = true;
      console.log("[MiniKit] Initialized successfully");
    } catch (e) {
      console.warn("[MiniKit] Installation failed (may not be in World App):", e);
      isReady = false;
    }
  })();
  
  return initPromise;
}

/**
 * Get current MiniKit status without throwing
 */
export function getMiniKitStatus() {
  return {
    isInstalled: MiniKit.isInstalled(),
    isReady,
    version: (MiniKit as any).version || "unknown",
    inWorldApp: typeof (window as any).WorldApp !== "undefined",
  };
}

/**
 * Ensure MiniKit is ready with retry logic (exponential backoff)
 */
export async function ensureReady(): Promise<void> {
  if (!initPromise) {
    throw new Error("MiniKit not initialized. Call initMiniKit first.");
  }
  
  await initPromise;
  
  // Retry logic with exponential backoff: 0ms, 1000ms, 2000ms
  const retryDelays = [0, 1000, 2000];
  
  for (let i = 0; i < retryDelays.length; i++) {
    if (i > 0) {
      console.log(`[MiniKit] Retry attempt ${i + 1}/${retryDelays.length} after ${retryDelays[i]}ms`);
      await new Promise(resolve => setTimeout(resolve, retryDelays[i]));
    }
    
    // Check both flags
    if (isReady && MiniKit.isInstalled()) {
      const status = getMiniKitStatus();
      console.log("[MiniKit] Ready:", status);
      return;
    }
  }
  
  // Final check failed
  const status = getMiniKitStatus();
  console.error("[MiniKit] Not available after retries:", status);
  throw new Error("MiniKit is not available. Please open this app in World App.");
}

/**
 * Request payment permission with explicit preflight check
 */
export async function ensurePayPermission(): Promise<void> {
  await ensureReady();
  
  try {
    const getPerms = (MiniKit.commandsAsync as any).getPermissions;
    const reqPerm = (MiniKit.commandsAsync as any).requestPermission;
    
    if (typeof getPerms === "function") {
      const res = await getPerms();
      const hasPay = Array.isArray(res?.finalPayload?.permissions) 
        ? res.finalPayload.permissions.includes("pay") 
        : false;
        
      if (!hasPay && typeof reqPerm === "function") {
        console.log("[MiniKit] Requesting 'pay' permission");
        await reqPerm({ permissions: ["pay"] });
      } else {
        console.log("[MiniKit] Pay permission already granted");
      }
    }
  } catch (e) {
    console.debug("[MiniKit] Permission preflight skipped (SDK may not support):", e);
  }
}

/**
 * @deprecated Use ensurePayPermission instead
 */
export async function requestPayPermission(): Promise<void> {
  return ensurePayPermission();
}

/**
 * Execute a payment with robust error handling and a SOFT UI timeout
 * - timeoutMs only controls UI/log warning, we still await the real result
 * - a hard safety cap of 120s prevents indefinite waiting
 */
export async function safePay(payload: PayCommandInput, timeoutMs = 20000): Promise<string> {
  await ensureReady();
  
  // Log environment status
  console.log("[MiniKit] Payment environment:", {
    isInstalled: MiniKit.isInstalled(),
    isReady,
    timeout: `${timeoutMs}ms`
  });
  
  // Always force WORLD_CHAIN for payments  
  const enhancedPayload: PayCommandInput = {
    ...payload,
    network: "WORLD_CHAIN" as any,
  };
  
  // Log payment details (non-PII)
  console.log("[MiniKit] Payment payload:", {
    to: enhancedPayload.to,
    token: enhancedPayload.tokens?.[0]?.symbol,
    amount: enhancedPayload.tokens?.[0]?.token_amount,
    network: enhancedPayload.network,
    reference: enhancedPayload.reference
  });
  
  const startTime = Date.now();
  const payPromise = MiniKit.commandsAsync.pay(enhancedPayload);
  
  // Soft UI timeout (does not reject)
  let uiTimeoutFired = false;
  const uiTimer = setTimeout(() => {
    uiTimeoutFired = true;
    console.warn("[MiniKit] UI timeout reached; continuing to wait for World App confirmation");
  }, timeoutMs);

  // Hard safety cap of 120s
  const hardCapMs = Math.max(timeoutMs, 120000);
  const hardCapPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Payment took too long. Please retry in World App.")), hardCapMs)
  );

  try {
    const result = await Promise.race([payPromise, hardCapPromise]);
    clearTimeout(uiTimer);

    const duration = Date.now() - startTime;
    const { finalPayload } = result as { finalPayload: MiniAppPaymentPayload };
    
    console.log("[MiniKit] Payment response received:", {
      status: finalPayload.status,
      duration: `${duration}ms`,
      uiTimeoutFired,
      hasTransactionId: !!(finalPayload as any).transaction_id
    });
    
    if (finalPayload.status === "success") {
      const txId = (finalPayload as any).transaction_id;
      console.log("[MiniKit] Payment success - txId:", txId);
      return txId;
    }
    
    if (finalPayload.status === "error") {
      const errorMsg = (finalPayload as any).error_message || "Payment failed";
      console.error("[MiniKit] Payment error:", errorMsg);
      throw new Error(errorMsg);
    }
    
    console.warn("[MiniKit] Payment canceled by user");
    throw new Error("Payment canceled");
  } catch (e: any) {
    clearTimeout(uiTimer);
    const duration = Date.now() - startTime;
    console.error("[MiniKit] Payment failed:", {
      error: e.message,
      duration: `${duration}ms`,
      type: e.name
    });
    throw e;
  }
}

/**
 * Send haptic feedback
 */
export async function sendHaptic(style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
  try {
    if (isReady && MiniKit.isInstalled()) {
      // Haptic feedback API may not be available in all MiniKit versions
      // Silently fail if not supported
      const feedback = (MiniKit.commandsAsync as any).sendHapticFeedback;
      if (typeof feedback === 'function') {
        await feedback(style);
      }
    }
  } catch (e) {
    // Non-critical, silently ignore
    console.debug("[MiniKit] Haptic feedback failed:", e);
  }
}
