import { useEffect, lazy, Suspense, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

const { networkConfig: suiNetworkConfig } = createNetworkConfig({
  mainnet: { network: 'mainnet', transport: new JsonRpcHTTPTransport({ url: getJsonRpcFullnodeUrl('mainnet') }) },
  testnet: { network: 'testnet', transport: new JsonRpcHTTPTransport({ url: getJsonRpcFullnodeUrl('testnet') }) },
});

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
  const [wcProjectId, setWcProjectId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('get-walletconnect-config');
        if (mounted && data?.projectId) setWcProjectId(data.projectId);
      } catch (e) {
        console.warn('[App] Failed to load WalletConnect projectId for Sui', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const suiWalletConfig = useMemo(() => {
    if (!wcProjectId) return undefined;
    return {
      walletConnect: {
        projectId: wcProjectId,
        metadata: {
          name: 'Vanity.box',
          description: 'Premium Web3 Identity',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://vanity.box',
          icons: ['https://vanity.box/favicon.ico'],
        },
      },
    } as const;
  }, [wcProjectId]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <SuiClientProvider networks={suiNetworkConfig} defaultNetwork="mainnet">
            <SuiWalletProvider
              autoConnect={false}
              walletConnect={suiWalletConfig?.walletConnect}
              preferredWallets={['Nightly', 'Sui Wallet', 'Suiet', 'Slush']}
            >
              <AppContent />
            </SuiWalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
