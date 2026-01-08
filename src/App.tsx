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
import { useParaConfig } from "@/hooks/useParaConfig";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

const queryClient = new QueryClient();

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

// Para-wrapped app content
const ParaWrappedContent = ({ paraApiKey, walletConnectProjectId }: { paraApiKey: string; walletConnectProjectId: string }) => (
  <ParaProvider
    paraClientConfig={{
      env: Environment.BETA,
      apiKey: paraApiKey,
    }}
    externalWalletConfig={
      {
        appName: "Vanity.box",
        wallets: [
          "METAMASK",
          "RAINBOW",
          "WALLETCONNECT",
          "COINBASE",
          "ZERION",
          "OKX",
          "SAFE",
          "RABBY",
        ],
        walletConnect: { projectId: walletConnectProjectId },
      } as any
    }
    paraModalConfig={{
      logo: "https://metadata.ens.domains/mainnet/avatar/odiin.eth?timestamp=1767661826173",
      theme: { font: "Inter", borderRadius: "xl" },
      oAuthMethods: ["GOOGLE", "APPLE"] as any,
      disableEmailLogin: true,
      disablePhoneLogin: true,
      authLayout: ["EXTERNAL:FULL", "AUTH:FULL"],
      recoverySecretStepEnabled: true,
      hideWallets: true,
      onRampTestMode: true,
    }}
    config={{ appName: "Vanity.box" }}
  >
    <ParaWalletContextProvider>
      <AppContent />
    </ParaWalletContextProvider>
  </ParaProvider>
);

// Main app with Para config loading
const AppWithPara = () => {
  const { config, isLoading, error } = useParaConfig();

  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  // While loading Para config, show app without Para (prevents flash)
  if (isLoading) {
    return <AppContent />;
  }

  // If Para config loaded successfully, wrap with Para
  if (config?.paraApiKey) {
    return (
      <ParaWrappedContent
        paraApiKey={config.paraApiKey}
        walletConnectProjectId={config.walletConnectProjectId}
      />
    );
  }

  // Fallback: no Para config, show app without Para
  console.warn('Para not configured:', error);
  return <AppContent />;
};

const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AppWithPara />
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
