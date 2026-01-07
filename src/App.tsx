import { useEffect } from "react";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ParaProvider, Environment } from "@getpara/react-sdk-lite";
import "@getpara/react-sdk-lite/styles.css";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

const queryClient = new QueryClient();

// Para configuration - using publishable API key
const PARA_API_KEY = import.meta.env.VITE_PARA_API_KEY || "";
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

// Inner app content - reused in both Para and non-Para modes
const AppContent = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <CryptoPriceProvider>
      <LanguageProvider>
        <TonConnectProvider>
          <PetraWalletProvider>
            <FarcasterAuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-use" element={<TermsOfUse />} />
                    <Route path="/:username" element={<Index />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </FarcasterAuthProvider>
          </PetraWalletProvider>
        </TonConnectProvider>
      </LanguageProvider>
    </CryptoPriceProvider>
  </ThemeProvider>
);

const App = () => {
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          {PARA_API_KEY ? (
            <ParaProvider
              paraClientConfig={{
                env: Environment.BETA,
                apiKey: PARA_API_KEY,
              }}
              externalWalletConfig={{
                // EVM-only external wallets
                wallets: ["METAMASK", "RAINBOW", "WALLETCONNECT", "COINBASE", "ZERION", "RABBY"] as any,
                walletConnect: { projectId: WALLETCONNECT_PROJECT_ID },
              }}
              paraModalConfig={{
                logo: "https://metadata.ens.domains/mainnet/avatar/odiin.eth?timestamp=1767661826173",
                theme: { font: "Inter", borderRadius: "xl" },
                oAuthMethods: ["GOOGLE", "APPLE"] as any,
                disableEmailLogin: true,
                disablePhoneLogin: true,
                authLayout: ["EXTERNAL:FULL", "AUTH:FULL"],
                recoverySecretStepEnabled: true,
                onRampTestMode: true,
              }}
              config={{ appName: "Vanity.box" }}
            >
              <ParaWalletContextProvider>
                <AppContent />
              </ParaWalletContextProvider>
            </ParaProvider>
          ) : (
            <AppContent />
          )}
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
