import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { LanguageSelector } from '@/components/LanguageSelector';
import patternTiles from '@/assets/pattern-tiles.jpeg';
import { MiniKit } from '@worldcoin/minikit-js';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import web3BioLogo from '@/assets/web3bio-logo.png';
import efpAppIcon from '@/assets/efp-app-icon.png';
import awesomeBoxIcon from '@/assets/awesome-box-icon.jpeg';

const Index = () => {
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
      
      {/* Hero Section */}
      <main className="flex-1 px-4 pt-24 md:pt-24 pb-20 relative z-10">
        <article className="max-w-2xl mx-auto text-center h-full flex flex-col">
          <h1 className="sr-only">Vanity.box - Your Premium Web3 Digital Identity</h1>
          <SearchInterface />
          
          {/* Featured on section */}
          <div className="mt-8 pt-8 border-t border-border/30">
            <p className="text-sm text-muted-foreground mb-4">Featured on</p>
            <div className="flex items-center justify-center gap-8">
              <a 
                href="https://web3.bio/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group"
              >
                <img 
                  src={web3BioLogo} 
                  alt="Web3.bio" 
                  className="w-12 h-12 object-contain"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Web3.bio</span>
              </a>
              <a 
                href="https://efp.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group"
              >
                <img 
                  src={efpAppIcon} 
                  alt="EFP.app" 
                  className="w-12 h-12 object-contain rounded-full"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">EFP.app</span>
              </a>
              <a 
                href="https://awesome.box" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group"
              >
                <img 
                  src={awesomeBoxIcon} 
                  alt="Awesome.box" 
                  className="w-12 h-12 object-contain"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Awesome.box</span>
              </a>
            </div>
          </div>
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
