// src/lib/minikit.ts
import { MiniKit, ResponseEvent, MiniAppPaymentPayload, Tokens, PayCommandInput } from "@worldcoin/minikit-js";

let initPromise: Promise<void> | null = null;
let isReady = false;
let installedAppId: string | null = null;

/**
 * Check if running in World App
 */
export function isInWorldApp(): boolean {
  return typeof (window as any).WorldApp !== "undefined" || 
         navigator.userAgent.includes("World App") ||
         navigator.userAgent.includes("WorldApp");
}

/**
 * Initialize MiniKit once on app load with retry logic
 */
export function initMiniKit(appId: string): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    console.log("[MiniKit] Starting initialization...", {
      appId,
      hasWorldApp: typeof (window as any).WorldApp !== "undefined",
      userAgent: navigator.userAgent.includes("World App") || navigator.userAgent.includes("WorldApp"),
      timestamp: new Date().toISOString()
    });
    
    try {
      installedAppId = appId;
      MiniKit.install(appId);
      isReady = true;
      
      const status = getMiniKitStatus();
      console.log("[MiniKit] Initialized successfully", status);
    } catch (e) {
      console.warn("[MiniKit] Installation failed (may not be in World App):", e);
      isReady = false;
      
      // Retry after 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        MiniKit.install(appId);
        isReady = true;
        console.log("[MiniKit] Retry successful");
      } catch (retryErr) {
        console.error("[MiniKit] Retry failed:", retryErr);
        isReady = false;
      }
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
    inWorldApp: isInWorldApp(),
  };
}

/**
 * Ensure MiniKit is ready with enhanced retry logic and fallback detection
 */
export async function ensureReady(): Promise<void> {
  console.log("[MiniKit] ensureReady called", {
    hasInitPromise: !!initPromise,
    isReady,
    isInstalled: MiniKit.isInstalled(),
    timestamp: new Date().toISOString()
  });
  
  if (!initPromise) {
    throw new Error("MiniKit not initialized. Call initMiniKit first.");
  }
  
  await initPromise;
  
  // Enhanced environment detection
  const hasWorldApp = typeof (window as any).WorldApp !== "undefined";
  const hasWorldAppUA = navigator.userAgent.includes("World App") || navigator.userAgent.includes("WorldApp");
  const hasMiniKitWindow = typeof (window as any).MiniKit !== "undefined";
  
  console.log("[MiniKit] Environment check:", {
    hasWorldApp,
    hasWorldAppUA,
    hasMiniKitWindow,
    isReady,
    isInstalled: MiniKit.isInstalled()
  });
  
  // If we detect World App environment but MiniKit isn't ready, try progressive fallbacks
  if ((hasWorldApp || hasWorldAppUA) && (!isReady || !MiniKit.isInstalled())) {
    console.warn("[MiniKit] World App detected but MiniKit not ready, attempting recovery...");
    
    // Retry logic with longer delays: 0ms, 500ms, 1500ms, 3000ms
    const retryDelays = [0, 500, 1500, 3000];
    
    for (let i = 0; i < retryDelays.length; i++) {
      if (i > 0) {
        console.log(`[MiniKit] Recovery attempt ${i + 1}/${retryDelays.length} after ${retryDelays[i]}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelays[i]));
      }
      
      // Try reinstalling
      try {
        MiniKit.install(installedAppId || 'app_ed7e61cb0c52630464178eed59e3fbdd');
        isReady = true;
        console.log(`[MiniKit] Recovery attempt ${i + 1} successful`);
      } catch (e) {
        console.warn(`[MiniKit] Recovery attempt ${i + 1} failed:`, e);
      }
      
      // Check if ready now
      if (isReady && MiniKit.isInstalled()) {
        const status = getMiniKitStatus();
        console.log("[MiniKit] Ready after recovery:", status);
        return;
      }
    }
  }
  
  // Standard retry logic
  const retryDelays = [0, 1000, 2000];
  
  for (let i = 0; i < retryDelays.length; i++) {
    if (i > 0) {
      console.log(`[MiniKit] Standard retry ${i + 1}/${retryDelays.length} after ${retryDelays[i]}ms`);
      await new Promise(resolve => setTimeout(resolve, retryDelays[i]));
    }
    
    if (isReady && MiniKit.isInstalled()) {
      const status = getMiniKitStatus();
      console.log("[MiniKit] Ready:", status);
      return;
    }
  }
  
  // Final check failed - provide detailed error
  const status = getMiniKitStatus();
  console.error("[MiniKit] Not available after all retries:", {
    ...status,
    hasWorldApp,
    hasWorldAppUA,
    hasMiniKitWindow
  });
  
  const errorMsg = hasWorldApp || hasWorldAppUA
    ? "MiniKit failed to initialize in World App. Please try closing and reopening the mini app."
    : "Please open this app in World App to use payment features.";
  
  throw new Error(errorMsg);
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
 * Get wallet address from World App using walletAuth
 */
export async function getWalletAddress(): Promise<string> {
  await ensureReady();
  
  // Check for cached wallet address
  const cached = localStorage.getItem('world_wallet_address');
  if (cached) {
    console.log("[MiniKit] Using cached wallet address");
    return cached;
  }
  
  console.log("[MiniKit] Requesting wallet authentication");
  
  const authParams = {
    nonce: `vanity-box-${Date.now()}`,
    requestId: `vanity-box-wallet-${Date.now()}`,
    expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    notBefore: new Date(),
    statement: 'Connect your wallet to Vanity.box to mint subdomains.'
  };
  
  const result = await MiniKit.commandsAsync.walletAuth(authParams);
  const { finalPayload } = result;
  
  if (finalPayload?.status !== 'success' || !finalPayload.address) {
    throw new Error('Wallet authentication failed');
  }
  
  const address = finalPayload.address;
  console.log("[MiniKit] Wallet address obtained:", address);
  
  // Cache the wallet address
  localStorage.setItem('world_wallet_address', address);
  
  return address;
}

/**
 * Send haptic feedback
 */
export async function sendHaptic(style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
  try {
    if (isReady && MiniKit.isInstalled()) {
      // Use the correct payload format for haptic feedback
      const feedback = (MiniKit.commands as any).sendHapticFeedback;
      if (typeof feedback === 'function') {
        feedback({
          hapticsType: 'impact',
          style: style === 'success' || style === 'warning' || style === 'error' ? 'medium' : style,
        });
      }
    }
  } catch (e) {
    // Non-critical, silently ignore
    console.debug("[MiniKit] Haptic feedback failed:", e);
  }
}
