import { useEffect, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PetraWalletProvider } from "@/contexts/PetraWalletContext";
import { TonConnectProvider } from "@/contexts/TonConnectContext";
import { FarcasterAuthProvider } from "@/contexts/FarcasterAuthContext";
import { CryptoPriceProvider } from "@/contexts/CryptoPriceContext";
import { ParaWalletContextProvider } from "@/contexts/ParaWalletContext";
import { ParaOnDemandWrapper } from "@/components/para/ParaOnDemandProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />
      <Route path="/:username" element={<Index />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const AppContent = () => {
  useEffect(() => {
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = "auto";
    };
  }, []);

  const handleParaConnectionChange = useCallback((isConnected: boolean, address: string | null) => {
    console.log('[App] Para connection changed:', { isConnected, address });
    if (isConnected && address) {
      window.dispatchEvent(new CustomEvent('wallet-connected', { 
        detail: { walletType: 'para', walletAddress: address } 
      }));
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <CryptoPriceProvider>
        <LanguageProvider>
          <TonConnectProvider>
            <PetraWalletProvider>
              <FarcasterAuthProvider>
                <ParaWalletContextProvider>
                  <ParaOnDemandWrapper onConnectionChange={handleParaConnectionChange}>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <AppRoutes />
                    </TooltipProvider>
                  </ParaOnDemandWrapper>
                </ParaWalletContextProvider>
              </FarcasterAuthProvider>
            </PetraWalletProvider>
          </TonConnectProvider>
        </LanguageProvider>
      </CryptoPriceProvider>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
