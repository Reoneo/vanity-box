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
 * Ensure MiniKit is ready and validate environment
 */
export async function ensureReady(): Promise<void> {
  if (!initPromise) {
    throw new Error("MiniKit not initialized. Call initMiniKit first.");
  }
  
  await initPromise;
  
  if (!isReady || !MiniKit.isInstalled()) {
    throw new Error("MiniKit is not available. Please open this app in World App.");
  }
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
 * Execute a payment with robust error handling and timeout
 */
export async function safePay(payload: PayCommandInput, timeoutMs = 20000): Promise<string> {
  await ensureReady();
  
  // Log environment status
  console.log("[MiniKit] Payment environment:", {
    isInstalled: MiniKit.isInstalled(),
    isReady,
    timeout: `${timeoutMs}ms`
  });
  
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
  
  try {
    const result = await Promise.race([
      MiniKit.commandsAsync.pay(enhancedPayload),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Payment confirmation in progress. Please check World App to complete the transaction.")),
          timeoutMs
        )
      ),
    ]);
    
    const duration = Date.now() - startTime;
    const { finalPayload } = result as { finalPayload: MiniAppPaymentPayload };
    
    console.log("[MiniKit] Payment response received:", {
      status: finalPayload.status,
      duration: `${duration}ms`,
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
