import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);
  const { isConnected: walletConnected, openChainModal } = useWalletConnect();

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
    <div className="h-screen bg-white dark:bg-black flex flex-col relative overflow-hidden">
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

      </div>
    </div>
  );
};

export default Index;
