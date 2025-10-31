import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initMiniKit } from "@/lib/minikit";

// Bootstrap MiniKit once on app load
initMiniKit('app_ed7e61cb0c52630464178eed59e3fbdd').then(() => {
  console.log("[App] MiniKit ready");
}).catch(() => {
  console.warn("[App] MiniKit not available (not in World App)");
});

createRoot(document.getElementById("root")!).render(<App />);
