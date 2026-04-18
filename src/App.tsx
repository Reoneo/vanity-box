import { useEffect, useState, lazy, Suspense, useMemo } from "react";
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

// Lazy load SplashCursor
const SplashCursor = lazy(() => import("@/components/SplashCursor"));

// Hook: enable splash cursor on touchscreen devices (coarse pointer)
const useTouchDevice = () => {
  const [touch, setTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setTouch(e.matches || 'ontouchstart' in window);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return touch;
};
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
  const hasFinePointer = useTouchDevice();
  useEffect(() => {
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = "auto";
    };
  }, []);

  // Tuned for 60fps on low-end mobile (e.g. Samsung Galaxy S10)
  const splashSettings = useMemo(() => ({
    SIM_RESOLUTION: 64,
    DYE_RESOLUTION: 256,
    CAPTURE_RESOLUTION: 256,
    DENSITY_DISSIPATION: 4.5,
    VELOCITY_DISSIPATION: 0.5,
    PRESSURE: 1,
    PRESSURE_ITERATIONS: 6,
    CURL: 0,
    SPLAT_RADIUS: 0.01,
    SPLAT_FORCE: 4500,
    SHADING: false,
    COLOR_UPDATE_SPEED: 30,
    targetFPS: 60,
  }), []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {/* Global gold SplashCursor for touchscreen devices */}
      {hasFinePointer && (
        <Suspense fallback={null}>
          <SplashCursor 
            enabled={true}
            SIM_RESOLUTION={splashSettings.SIM_RESOLUTION}
            DYE_RESOLUTION={splashSettings.DYE_RESOLUTION}
            CAPTURE_RESOLUTION={splashSettings.CAPTURE_RESOLUTION}
            DENSITY_DISSIPATION={splashSettings.DENSITY_DISSIPATION}
            VELOCITY_DISSIPATION={splashSettings.VELOCITY_DISSIPATION}
            PRESSURE={splashSettings.PRESSURE}
            PRESSURE_ITERATIONS={splashSettings.PRESSURE_ITERATIONS}
            CURL={splashSettings.CURL}
            SPLAT_RADIUS={splashSettings.SPLAT_RADIUS}
            SPLAT_FORCE={splashSettings.SPLAT_FORCE}
            SHADING={splashSettings.SHADING}
            COLOR_UPDATE_SPEED={splashSettings.COLOR_UPDATE_SPEED}
            targetFPS={splashSettings.targetFPS}
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
              <AppContent />
            </SuiWalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
