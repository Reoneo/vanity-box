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
import { ParaProvider } from "@getpara/react-sdk-lite";
import "@getpara/react-sdk-lite/styles.css";
import { useParaConfig } from "@/hooks/useParaConfig";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

const queryClient = new QueryClient();

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

type ParaEnvString = "BETA" | "PROD";

/**
 * Use string env because some SDK builds still try to parse API key prefix
 * unless env is a valid string.
 */
const inferParaEnvString = (apiKey: string): ParaEnvString => {
  const key = apiKey.trim().toLowerCase();

  if (key.startsWith("prod") || key.startsWith("pk_live") || key.startsWith("live") || key.includes("prod")) {
    return "PROD";
  }

  if (key.startsWith("beta") || key.startsWith("pk_test") || key.startsWith("test") || key.includes("beta")) {
    return "BETA";
  }

  return "BETA";
};

const normalizeEnvString = (env: any, apiKey: string): ParaEnvString => {
  if (env === "PROD" || env === "prod") return "PROD";
  if (env === "BETA" || env === "beta") return "BETA";
  return inferParaEnvString(apiKey);
};

const ParaWrappedContent = ({
  paraApiKey,
  walletConnectProjectId,
  env,
}: {
  paraApiKey: string;
  walletConnectProjectId: string;
  env?: any;
}) => {
  const trimmedKey = (paraApiKey || "").trim();
  const wcProjectId = (walletConnectProjectId || "").trim();

  // CRITICAL: never mount Para with empty key (prevents blank-screen crash)
  if (!trimmedKey) return <AppContent />;

  const resolvedEnv: ParaEnvString = normalizeEnvString(env, trimmedKey);

  return (
    <ParaProvider
      paraClientConfig={{
        apiKey: trimmedKey,
        env: resolvedEnv, // ✅ MUST be "BETA" | "PROD" string
      }}
      externalWalletConfig={
        {
          appName: "Vanity.box",
          wallets: ["METAMASK", "RAINBOW", "WALLETCONNECT", "COINBASE", "ZERION", "OKX", "SAFE", "RABBY"],
          walletConnect: { projectId: wcProjectId },
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
};

const AppWithPara = () => {
  const { config, isLoading, error } = useParaConfig();

  useEffect(() => {
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = "auto";
    };
  }, []);

  // While loading config: show app without Para
  if (isLoading) return <AppContent />;

  // If config failed: show app without Para
  if (error) {
    console.warn("Para not configured:", error);
    return <AppContent />;
  }

  // If config ok: wrap with Para
  if (config?.paraApiKey) {
    return (
      <ParaWrappedContent
        paraApiKey={config.paraApiKey}
        walletConnectProjectId={config.walletConnectProjectId || ""}
        env={config.env}
      />
    );
  }

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
