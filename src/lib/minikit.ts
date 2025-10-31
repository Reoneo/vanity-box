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
 * Request payment permission (simplified - permission system may vary)
 */
export async function requestPayPermission(): Promise<void> {
  await ensureReady();
  console.log("[MiniKit] Payment permission check (auto-granted in World App)");
  // MiniKit in World App typically auto-grants payment access
  // No explicit permission request needed for Pay command
}

/**
 * Execute a payment with robust error handling and timeout
 */
export async function safePay(payload: PayCommandInput, timeoutMs = 45000): Promise<string> {
  await ensureReady();
  
  const enhancedPayload: PayCommandInput = {
    ...payload,
    network: "WORLD_CHAIN" as any, // Ensure World Chain network
  };
  
  console.log("[MiniKit] Initiating payment:", enhancedPayload);
  
  try {
    const result = await Promise.race([
      MiniKit.commandsAsync.pay(enhancedPayload),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Payment didn't complete in time. If you confirmed in World App, check My IDs shortly.")),
          timeoutMs
        )
      ),
    ]);
    
    const { finalPayload } = result as { finalPayload: MiniAppPaymentPayload };
    
    if (finalPayload.status === "success") {
      console.log("[MiniKit] Payment success:", finalPayload.transaction_id);
      return finalPayload.transaction_id;
    }
    
    if (finalPayload.status === "error") {
      const errorMsg = (finalPayload as any).error_message || "Payment failed";
      throw new Error(errorMsg);
    }
    
    // User cancelled
    throw new Error("Payment canceled");
  } catch (e: any) {
    console.error("[MiniKit] Payment error:", e);
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
