import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import patternTiles from '@/assets/pattern-tiles.jpeg';
import { MiniKit } from '@worldcoin/minikit-js';

const Index = () => {
  const { t } = useLanguage();
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
      <main className="flex-1 px-4 pt-20 md:pt-28 pb-2 relative z-10 overflow-hidden">
        <div className="max-w-2xl mx-auto text-center h-full flex flex-col">
          <SearchInterface />
        </div>
      </main>
      <footer className="py-2 text-center text-[10px] md:text-xs text-foreground dark:text-white">
        {t('copyright')}
      </footer>
    </div>
  );
};

export default Index;
