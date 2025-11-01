import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initMiniKit } from "@/lib/minikit";
import App from "./App";
import "./index.css";

// Bootstrap MiniKit on app load
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
