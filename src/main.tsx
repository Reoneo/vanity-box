import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initMiniKit } from "@/lib/minikit";
import { Web3ModalProvider } from "@/lib/Web3ModalContext"; // <-- adjust path if your provider file is elsewhere

// Bootstrap MiniKit once on app load with enhanced logging
const APP_ID = "app_ed7e61cb0c52630464178eed59e3fbdd";

console.log("[App] Initializing app...", {
  hasWorldApp: typeof (window as any).WorldApp !== "undefined",
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
});

initMiniKit(APP_ID)
  .then(() => {
    console.log("[App] MiniKit initialization complete");
  })
  .catch((e) => {
    console.warn("[App] MiniKit initialization failed:", e);
  });

try {
  console.log("[App] Starting React render...");
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Web3ModalProvider>
        <App />
      </Web3ModalProvider>
    </React.StrictMode>,
  );
  console.log("[App] React render initiated successfully");
} catch (error) {
  console.error("[App] Fatal error during render:", error);
  document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace;">
    <h1>App Failed to Load</h1>
    <pre>${String(error)}</pre>
  </div>`;
}
