import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchInterface } from "@/components/SearchInterface";
import { PersonalizedHeader } from "@/components/PersonalizedHeader";
import { LanguageSelector } from "@/components/LanguageSelector";
import SplashCursor from "@/components/SplashCursor";
import { Sun, Moon } from "lucide-react";
import patternTiles from "@/assets/pattern-tiles.jpeg";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const Index = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);

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

  return (
    <div className="h-screen bg-background flex flex-col relative overflow-hidden">
      <SplashCursor enabled={true} />

      {/* Gold border wrapper - fixed position z-50 to appear over everything including infinite menu */}
      <div className="fixed inset-0 border-l-2 border-r-2 border-[#D4AF37] pointer-events-none z-50" />

      {/* Content wrapper */}
      <div className="h-screen flex flex-col relative z-40">
        {/* Blur overlay when language selector is open */}
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <div className="absolute inset-0" id="page-blur-target"></div>
        </div>

        <div className="pointer-events-auto flex-shrink-0">
          <Header />
        </div>

        {/* Hero Section - Takes remaining space between header and footer */}
        <main className="flex-1 relative z-10 flex items-center justify-center pointer-events-auto overflow-hidden">
          <article className="w-full h-full">
            <SearchInterface />
          </article>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 py-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] border-t-2 border-[#D4AF37] z-[9999] pointer-events-auto">
          <div className="container mx-auto px-4 flex items-center justify-between text-xs">
            {/* Language Selector on Left */}
            <div className="flex items-center gap-1.5">
              <LanguageSelector />
            </div>

            {/* Copyright Centered */}
            <div className="text-black absolute left-1/2 transform -translate-x-1/2 font-normal whitespace-nowrap">
              © 2026 vanity.box. All rights reserved.
            </div>

            {/* Theme Toggle on Right */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover:opacity-70 transition-opacity"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-6 h-6 text-black" /> : <Moon className="w-6 h-6 text-black" />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
