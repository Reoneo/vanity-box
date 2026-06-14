import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";

// Subdomain redirect: any *.vanity.box → vanity.box/{sub}.vanity
// Bluesky-style handle hosting: mrs.vanity.box loads the mrs.vanity profile,
// and the Cloudflare Worker serves /.well-known/atproto-did for the same host.
(() => {
  const h = window.location.hostname;
  const SKIP = new Set(["www", "app", "api", "get", "id-preview", "preview", "staging"]);
  if (h.endsWith(".vanity.box")) {
    const sub = h.slice(0, -".vanity.box".length);
    if (sub && !sub.includes(".") && !SKIP.has(sub) && !sub.startsWith("id-preview")) {
      // Do NOT redirect the .well-known endpoint — that is served by the Worker.
      if (window.location.pathname.startsWith("/.well-known/")) return;
      const path = window.location.pathname === "/" ? "" : window.location.pathname;
      window.location.replace(
        `https://vanity.box/${sub}.vanity${path}${window.location.search}${window.location.hash}`
      );
      return;
    }
  }
})();
import { initMiniKit } from "@/lib/minikit";

// Bootstrap MiniKit once on app load with enhanced logging
const APP_ID = 'app_ed7e61cb0c52630464178eed59e3fbdd';

console.log("[App] Initializing app...", {
  hasWorldApp: typeof (window as any).WorldApp !== "undefined",
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString()
});

initMiniKit(APP_ID).then(() => {
  console.log("[App] MiniKit initialization complete");
}).catch((e) => {
  console.warn("[App] MiniKit initialization failed:", e);
});

try {
  console.log("[App] Starting React render...");
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("[App] React render initiated successfully");
} catch (error) {
  console.error("[App] Fatal error during render:", error);
  document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace;">
    <h1>App Failed to Load</h1>
    <pre>${error}</pre>
  </div>`;
}
