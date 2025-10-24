import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import patternTiles from '@/assets/pattern-tiles.jpeg';
import { MiniKit } from '@worldcoin/minikit-js';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const Index = () => {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);

  // Listen for wallet connection events from WalletConnection component
  useEffect(() => {
    const handleWalletChange = (event: CustomEvent) => {
      setUser(event.detail);
    };

    window.addEventListener('wallet-connected', handleWalletChange as EventListener);
    window.addEventListener('wallet-disconnected', () => setUser(null));

    return () => {
      window.removeEventListener('wallet-connected', handleWalletChange as EventListener);
      window.removeEventListener('wallet-disconnected', () => setUser(null));
    };
  }, []);

  // No longer needed - mint flow is handled directly in SearchInterface

  return (
    <div className="min-h-screen bg-background flex flex-col relative border-l-2 border-r-2 border-[#D4AF37] overflow-hidden">
      {/* Blur overlay when language selector is open */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <div className="absolute inset-0" id="page-blur-target"></div>
      </div>
      
      <Header />
      
      {/* Hero Section - Optimized for mobile (no scroll) with proper header spacing */}
      <main className="flex-1 px-4 pt-24 md:pt-24 pb-20 relative z-10">
        <article className="max-w-2xl mx-auto text-center h-full flex flex-col">
          <h1 className="sr-only">Vanity.box - Your Premium Web3 Digital Identity</h1>
          <SearchInterface />
        </article>
      </main>
      <footer className="fixed bottom-0 left-0 right-0 py-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] border-t-2 border-[#D4AF37] z-[9999] safe-area-inset-bottom">
        <div className="container mx-auto px-4 flex items-center justify-between text-xs">
          {/* Language Selector on Left */}
          <div className="flex items-center gap-1.5">
            <LanguageSelector />
          </div>
          
          {/* Copyright Centered */}
          <div className="text-black absolute left-1/2 transform -translate-x-1/2 font-normal whitespace-nowrap">
            © 2025 vanity.box. All rights reserved.
          </div>
          
          {/* Theme Toggle on Right */}
          <div className="flex items-center">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-7 h-7 flex items-center justify-center transition-all duration-300 hover:opacity-80"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-black" />
              ) : (
                <Moon className="w-5 h-5 text-black" />
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
