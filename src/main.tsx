import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MiniKit } from "@worldcoin/minikit-js";

// Install MiniKit once before rendering App
try {
  MiniKit.install('app_ed7e61cb0c52630464178eed59e3fbdd');
} catch (e) {
  console.warn("[MiniKit] Installation failed (may not be in World App):", e);
}

createRoot(document.getElementById("root")!).render(<App />);
