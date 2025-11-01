import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { HelmetProvider } from 'react-helmet-async';
import { PrivyAuthProvider } from "@/contexts/PrivyAuthProvider";
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
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <PrivyAuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </PrivyAuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
);
