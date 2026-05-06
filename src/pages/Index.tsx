import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchInterface } from "@/components/SearchInterface";
import { PersonalizedHeader } from "@/components/PersonalizedHeader";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Sun, Moon } from "lucide-react";
import patternTiles from "@/assets/pattern-tiles.jpeg";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useWalletConnect } from "@/contexts/WalletConnectContext";
import { NetworkIcon } from "@/components/NetworkIcon";

const Index = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { username } = useParams<{ username?: string }>();
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);
  const { isConnected: walletConnected, openChainModal } = useWalletConnect();

  // Profile-specific theme overrides
  const isPoap = username?.toLowerCase() === "poap.eth";
  const accentColor = isPoap ? "#B8B8E8" : "#D4AF37";
  const accentLight = isPoap ? "#D0D0F0" : "#F4E4BC";

  // Listen for wallet connection events
  useEffect(() => {
    const handleWalletChange = (event: CustomEvent) => {
      setUser(event.detail);
    };

    window.addEventListener("wallet-connected", handleWalletChange as EventListener);
    window.addEventListener("wallet-disconnected", () => setUser(null));

    return () => {
      window.removeEventListener("wallet-connected", handleWalletChange as EventListener);
      window.removeEventListener("wallet-disconnected", () => setUser(null));
    };
  }, []);

  // Auto-backfill www CNAMEs for any new .vanity names registered since last sync.
  // Throttled to once every 6 hours per browser to avoid hammering Dune/Cloudflare.
  useEffect(() => {
    const KEY = "vanity_www_autosync_at";
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    try {
      const last = Number(localStorage.getItem(KEY) || "0");
      if (Date.now() - last < SIX_HOURS) return;
    } catch { /* localStorage unavailable */ }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-vanity-dns`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    // Fire-and-forget; user never sees this
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ action: "sync-quick" }),
    })
      .then(async (r) => {
        if (r.ok) {
          try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
          const j = await r.json().catch(() => null);
          if (j?.wwwCnames?.created > 0) {
            console.log(`[vanity auto-sync] ${j.message}`);
          }
        }
      })
      .catch(() => { /* silent — background task */ });
  }, []);

  return (
    <div className="min-h-screen h-full bg-background flex flex-col relative overflow-x-hidden">
      {/* Gold border wrapper - fixed position z-50 to appear over everything including infinite menu */}
      <div className="fixed inset-0 border-l-2 border-r-2 pointer-events-none z-50" style={{ borderColor: accentColor }} />

      {/* Content wrapper */}
      <div className="min-h-screen h-full flex flex-col relative z-40">
        {/* Blur overlay when language selector is open */}
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <div className="absolute inset-0" id="page-blur-target"></div>
        </div>

        <div className="pointer-events-auto flex-shrink-0">
          <Header accentColor={accentColor} />
        </div>

        {/* Hero Section - Takes remaining space between header and footer */}
        <main className="flex-1 relative z-10 flex items-center justify-center pointer-events-auto overflow-x-hidden bg-background">
          <article className="w-full h-full bg-background">
            <SearchInterface />
          </article>
        </main>

        <footer className={`fixed bottom-0 left-0 right-0 py-1 bg-gradient-to-r ${footerGradient} border-t-2 z-[9999] pointer-events-auto`} style={{ borderColor: accentColor }}>
          <div className="container mx-auto px-4 flex items-center justify-between text-xs">
            {/* Language Selector on Left */}
            <div className="flex items-center gap-1.5">
              <LanguageSelector />
            </div>

            {/* Copyright Centered */}
            <div className="text-black absolute left-1/2 transform -translate-x-1/2 font-normal whitespace-nowrap">
              © 2026 vanity.box. All rights reserved.
            </div>

            {/* Network Switch and Theme Toggle on Right */}
            <div className="flex items-center gap-3">
              {/* Network Switch - only show when wallet is connected */}
              {walletConnected && (
                <button
                  onClick={openChainModal}
                  className="hover:opacity-70 transition-opacity"
                  aria-label="Switch Network"
                >
                  <NetworkIcon size={20} />
                </button>
              )}
              
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:opacity-70 transition-opacity"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-6 h-6 text-black" /> : <Moon className="w-6 h-6 text-black" />}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
