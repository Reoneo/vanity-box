import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initMiniKit } from "@/lib/minikit";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { getTonConnectManifest } from './lib/tonConnect';

// Global error handlers
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[Global Error]', { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('[Unhandled Promise Rejection]', event.reason);
};

// Bootstrap MiniKit once on app load with enhanced logging
const APP_ID = 'app_ed7e61cb0c52630464178eed59e3fbdd';

console.log("[App] Initializing app...", {
  hasWorldApp: typeof (window as any).WorldApp !== "undefined",
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString()
});

try {
  initMiniKit(APP_ID).then(() => {
    console.log("[App] MiniKit initialization complete");
  }).catch((e) => {
    console.warn("[App] MiniKit initialization failed:", e);
  });

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  console.log("[App] Creating React root...");
  createRoot(rootElement).render(
    <TonConnectUIProvider manifestUrl={getTonConnectManifest()}>
      <App />
    </TonConnectUIProvider>
  );
  console.log("[App] React root created successfully");
} catch (error) {
  console.error("[App] Fatal error during initialization:", error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-center: center; min-height: 100vh; padding: 20px; background: #000; color: #fff; font-family: system-ui;">
      <div style="text-align: center; max-width: 500px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Failed to Load Application</h1>
        <p style="margin-bottom: 20px; opacity: 0.8;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background: #D4AF37; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
          Reload Page
        </button>
      </div>
    </div>
  `;
}
