import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { useLanguage } from '@/contexts/LanguageContext';
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
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden border-l-2 border-r-2 border-b-2 border-[#D4AF37]">
      
      <Header />
      
      {/* Hero Section - Optimized for mobile (no scroll) with proper header spacing */}
      <main className="flex-1 px-4 pt-24 md:pt-24 pb-2 relative z-10 overflow-hidden">
        <div className="max-w-2xl mx-auto text-center h-full flex flex-col">
          <SearchInterface />
        </div>
      </main>
      <footer className="sticky bottom-0 py-3 bg-[#D4AF37] z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Theme Toggle on Left */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all duration-300"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-black" />
              ) : (
                <Moon className="w-5 h-5 text-black" />
              )}
            </button>
          </div>
          
          {/* Copyright in Center */}
          <div className="text-[10px] md:text-xs text-black">
            {t('copyright')}
          </div>
          
          {/* Empty div for balance */}
          <div className="w-10"></div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
