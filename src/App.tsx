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

// wagmi v2
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
});

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

const inferParaEnvironment = (apiKey: string): Environment => {
  const key = apiKey.trim().toLowerCase();
  if (key.startsWith("prod") || key.includes("prod") || key.startsWith("live") || key.startsWith("pk_live")) {
    return Environment.PROD;
  }
  return Environment.BETA;
};

const normalizeEnvironment = (env: any, apiKey: string): Environment => {
  if (env === Environment.PROD || env === "PROD" || env === "prod") return Environment.PROD;
  if (env === Environment.BETA || env === "BETA" || env === "beta") return Environment.BETA;
  return inferParaEnvironment(apiKey);
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
  const trimmedKey = String(paraApiKey ?? "").trim();
  const wcProjectId = String(walletConnectProjectId ?? "").trim();

  if (!trimmedKey) return <AppContent />;

  const resolvedEnv = normalizeEnvironment(env, trimmedKey);

  return (
    <ParaProvider
      paraClientConfig={{
        env: resolvedEnv,
        apiKey: trimmedKey,
      }}
      externalWalletConfig={
        {
          appName: "Vanity.box",
          wallets: ["METAMASK", "RAINBOW", "WALLETCONNECT", "COINBASE"],
          walletConnect: { projectId: wcProjectId },
        } as any
      }
      paraModalConfig={
        {
          logo: "https://metadata.ens.domains/mainnet/avatar/odiin.eth?timestamp=1767661826173",
          theme: { font: "Inter", borderRadius: "xl" },
          oAuthMethods: ["GOOGLE", "APPLE"],
          disableEmailLogin: true,
          disablePhoneLogin: true,
          authLayout: ["EXTERNAL:FULL", "AUTH:FULL"],
          recoverySecretStepEnabled: true,
          hideWallets: true,
          onRampTestMode: true,
        } as any
      }
      config={{
        appName: "Vanity.box",
        disableAutoSessionKeepAlive: true,
      }}
    >
      <AppContent />
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

  // While loading: still render app (ParaWalletContextProvider + WagmiProvider already exist)
  if (isLoading) return <AppContent />;

  if (error) {
    console.warn("Para not configured:", error);
    return <AppContent />;
  }

  if (config?.paraApiKey) {
    return (
      <ParaWrappedContent
        paraApiKey={config.paraApiKey}
        walletConnectProjectId={config.walletConnectProjectId || ""}
        env={config.env ?? (config as any).environment}
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
          <WagmiProvider config={wagmiConfig}>
            {/* ✅ Always mounted: your WalletConnection can always call openParaModal() */}
            <ParaWalletContextProvider>
              <AppWithPara />
            </ParaWalletContextProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
