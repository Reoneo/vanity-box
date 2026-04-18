import { useEffect, lazy, Suspense, useMemo } from "react";
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
import { WalletConnectProvider } from "@/contexts/WalletConnectContext";
import { IotaWalletProvider } from "@/contexts/IotaWalletContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import '@mysten/dapp-kit/dist/index.css';
import { createNetworkConfig, SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { JsonRpcHTTPTransport, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { DAppKitProvider } from '@vechain/dapp-kit-react';

const { networkConfig: suiNetworkConfig } = createNetworkConfig({
  mainnet: { network: 'mainnet', transport: new JsonRpcHTTPTransport({ url: getJsonRpcFullnodeUrl('mainnet') }) },
  testnet: { network: 'testnet', transport: new JsonRpcHTTPTransport({ url: getJsonRpcFullnodeUrl('testnet') }) },
});

// VeChain DAppKit configuration — mainnet, supports VeWorld + WalletConnect
const VECHAIN_NODE_URL = 'https://mainnet.vechain.org/';
const vechainWalletConnectOptions = {
  projectId: 'a0b855ceaf109dbc8426479a4c3d38d8', // shared sample project id; replace with own for production
  metadata: {
    name: 'Vanity.box',
    description: 'Premium Web3 Identity',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://vanity.box',
    icons: ['https://vanity.box/favicon.ico'],
  },
};

// Lazy load SplashCursor for desktop only
const SplashCursor = lazy(() => import("@/components/SplashCursor"));

// Detect desktop vs mobile
const isDesktop = typeof window !== 'undefined' && 
  !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Messages from "./pages/Messages";
import UdRedirect from "./pages/UdRedirect";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-use" element={<TermsOfUse />} />
      <Route path="/ud" element={<UdRedirect />} />
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

  // Optimized settings for desktop splash effect
  const splashSettings = useMemo(() => ({
    DYE_RESOLUTION: 360,
    SIM_RESOLUTION: 48,
    PRESSURE_ITERATIONS: 10,
  }), []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {/* Global gold SplashCursor for desktop only */}
      {isDesktop && (
        <Suspense fallback={null}>
          <SplashCursor 
            enabled={true}
            DYE_RESOLUTION={splashSettings.DYE_RESOLUTION}
            SIM_RESOLUTION={splashSettings.SIM_RESOLUTION}
            PRESSURE_ITERATIONS={splashSettings.PRESSURE_ITERATIONS}
          />
        </Suspense>
      )}
      <CryptoPriceProvider>
        <LanguageProvider>
          <TonConnectProvider>
            <PetraWalletProvider>
              <FarcasterAuthProvider>
                <WalletConnectProvider>
                  <IotaWalletProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <AppRoutes />
                    </TooltipProvider>
                  </IotaWalletProvider>
                </WalletConnectProvider>
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
          <SuiClientProvider networks={suiNetworkConfig} defaultNetwork="mainnet">
            <SuiWalletProvider
              autoConnect={false}
              preferredWallets={['Nightly', 'Slush', 'Sui Wallet', 'Suiet', 'Phantom']}
              slushWallet={{
                name: 'Vanity.box',
              }}
            >
              <DAppKitProvider
                nodeUrl={VECHAIN_NODE_URL}
                usePersistence={true}
                walletConnectOptions={vechainWalletConnectOptions}
              >
                <AppContent />
              </DAppKitProvider>
            </SuiWalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
