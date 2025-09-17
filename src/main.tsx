import { createRoot } from "react-dom/client";
import { MiniKit } from "@worldcoin/minikit-js";
import App from "./App.tsx";
import "./index.css";

// Install MiniKit for World App integration
const appId = import.meta.env.VITE_WORLD_APP_ID;
if (appId && appId !== "your_world_app_mini_app_id_here") {
  MiniKit.install(appId);
  console.log('✅ MiniKit installed with app ID:', appId);
} else {
  console.warn('⚠️ VITE_WORLD_APP_ID not found or not configured. World App features may not work properly.');
}

createRoot(document.getElementById("root")!).render(<App />);
