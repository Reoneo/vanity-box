import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { LanguageSelector } from '@/components/LanguageSelector';
import SplashCursor from '@/components/SplashCursor';
import patternTiles from '@/assets/pattern-tiles.jpeg';
import { MiniKit } from '@worldcoin/minikit-js';
import { isTelegramWebView } from '@/lib/telegram';
import worldAppIcon from '@/assets/world-app-icon.png';
import telegramIcon from '@/assets/telegram-icon.png';

import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const Index = () => {
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);
  const [showMiniApps, setShowMiniApps] = useState(true);

  // Listen for wallet connection events
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

  const handleWorldAppClick = () => {
    if (!MiniKit.isInstalled()) {
      window.open('https://world.org/ecosystem/app_ed7e61cb0c52630464178eed59e3fbdd', '_blank');
    } else {
      console.log('Already in World App');
    }
  };

  const handleTelegramClick = () => {
    if (!isTelegramWebView()) {
      window.open('https://t.me/vanitybox_bot/vanity', '_blank');
    } else {
      console.log('Already in Telegram');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <SplashCursor />
      
      {/* Gold border wrapper - fixed position z-50 to appear over everything including infinite menu */}
      <div className="fixed inset-0 border-l-2 border-r-2 border-[#D4AF37] pointer-events-none z-50" />
      
      {/* Content wrapper */}
      <div className="min-h-screen flex flex-col relative z-40">
        {/* Blur overlay when language selector is open */}
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <div className="absolute inset-0" id="page-blur-target"></div>
        </div>
        
        <div className="pointer-events-auto">
          <Header />
        </div>
        
        {/* Hero Section */}
        <main className="flex-1 px-4 pt-8 pb-2 relative z-10 flex flex-col items-center justify-center pointer-events-auto">
          <article className="max-w-2xl mx-auto text-center w-full flex flex-col items-center justify-center min-h-[calc(100vh-6rem)]">
            <SearchInterface 
              onSearchClick={() => setShowMiniApps(false)} 
              onClearSearch={() => setShowMiniApps(true)}
            />

            {/* Mini Apps Section - Only on Home Page */}
            {showMiniApps && (
              <div className="flex flex-col items-center gap-2 mt-8">
                <h2 className="text-sm md:text-base font-semibold text-[#D4AF37] tracking-[0.3em] uppercase mb-1">
                  Mini Apps
                </h2>
                <div className="flex items-center justify-center gap-6">
                  {/* World App Icon */}
                  <button
                    onClick={handleWorldAppClick}
                    className="group relative flex items-center justify-center transition-all duration-300"
                    aria-label="World App"
                  >
                    <div className="rounded-full border-2 border-[#D4AF37] p-2.5 bg-background/40 backdrop-blur-md group-hover:bg-background/60 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.7)] group-hover:border-[#F4E4BC] transition-all duration-500">
                      <img 
                        src={worldAppIcon} 
                        alt="World App" 
                        className="w-11 h-11 md:w-12 md:h-12 object-contain transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12"
                      />
                    </div>
                  </button>

                  {/* Telegram Icon */}
                  <button
                    onClick={handleTelegramClick}
                    className="group relative flex items-center justify-center transition-all duration-300"
                    aria-label="Telegram"
                  >
                    <div className="rounded-full border-2 border-[#D4AF37] p-2.5 bg-background/40 backdrop-blur-md group-hover:bg-background/60 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.7)] group-hover:border-[#F4E4BC] transition-all duration-500">
                      <img 
                        src={telegramIcon} 
                        alt="Telegram" 
                        className="w-11 h-11 md:w-12 md:h-12 object-contain transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12"
                      />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </article>
        </main>
        
        <footer className="fixed bottom-0 left-0 right-0 py-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] border-t-2 border-[#D4AF37] z-[9999] safe-area-inset-bottom pointer-events-auto">
          <div className="container mx-auto px-4 flex items-center justify-between text-xs">
            {/* Language Selector on Left */}
            <div className="flex items-center gap-1.5">
              <LanguageSelector />
            </div>
            
            {/* Copyright Centered */}
            <div className="text-black absolute left-1/2 transform -translate-x-1/2 font-normal whitespace-nowrap">
              © 2025 vanity.box. All rights reserved.
            </div>
            
            {/* Empty div for spacing (theme toggle hidden) */}
            <div className="w-7 h-7"></div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
