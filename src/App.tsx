import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MiniKit } from "@worldcoin/minikit-js";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

const queryClient = new QueryClient();

// Bootstrap MiniKit globally with app_id
const MiniKitBootstrap = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const appId = import.meta.env.VITE_MINIKIT_APP_ID as string;
    const env = (import.meta.env.VITE_MINIKIT_ENV as string) || "production";
    
    if (!appId) {
      console.warn("[MiniKit] Missing VITE_MINIKIT_APP_ID in environment variables");
    }
    
    (MiniKit as any).install({ app_id: appId, environment: env });
    console.debug("[MiniKit] install() called with app_id:", appId, "environment:", env);
  }, []);

  return children as any;
};

const App = () => (
  <HelmetProvider>
    <MiniKitBootstrap>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-use" element={<TermsOfUse />} />
                  {/* User profile routes - must come before catch-all */}
                  <Route path="/:username" element={<Index />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MiniKitBootstrap>
  </HelmetProvider>
);

export default App;
