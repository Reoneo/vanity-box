import { useEffect, lazy, Suspense } from "react";
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
import Index from "./pages/Index";

// Lazy load non-critical pages for faster initial load
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));

// Optimize QueryClient for 60fps performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  // Optimize scroll performance for 60fps
  useEffect(() => {
    // Prevent pull-to-refresh and enable GPU acceleration
    document.body.style.overscrollBehavior = 'none';
    (document.body.style as any).webkitOverflowScrolling = 'touch';
    document.documentElement.style.overscrollBehavior = 'none';
    
    // Enable CSS containment for better paint performance
    document.body.style.contain = 'layout style paint';
    
    return () => {
      document.body.style.overscrollBehavior = 'auto';
      document.documentElement.style.overscrollBehavior = 'auto';
    };
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider>
            <TonConnectProvider>
              <PetraWalletProvider>
                <FarcasterAuthProvider>
                  <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                  <Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-of-use" element={<TermsOfUse />} />
                      {/* User profile routes - must come before catch-all */}
                      <Route path="/:username" element={<Index />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
                  </TooltipProvider>
                </FarcasterAuthProvider>
              </PetraWalletProvider>
            </TonConnectProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
