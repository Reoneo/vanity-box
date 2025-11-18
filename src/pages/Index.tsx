import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { LanguageSelector } from '@/components/LanguageSelector';
import SplashCursor from '@/components/SplashCursor';
import { Sun, Moon } from 'lucide-react';
import patternTiles from '@/assets/pattern-tiles.jpeg';
import { MiniKit } from '@worldcoin/minikit-js';
import { isTelegramWebView } from '@/lib/telegram';
import worldAppIcon from '@/assets/world-app-icon.png';
import telegramIcon from '@/assets/telegram-icon.png';
import petraIcon from '@/assets/petra-icon.png';


import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const Index = React.memo(() => {
  console.log('[Index] Component rendering');
  
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);
  const [showMiniApps, setShowMiniApps] = useState(true);
  

  // Check if we're on the home page (only show mini apps there)
  const isHomePage = location.pathname === '/';

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

  const handleWorldAppClick = useCallback(() => {
    if (!MiniKit.isInstalled()) {
      window.open('https://world.org/ecosystem/app_ed7e61cb0c52630464178eed59e3fbdd', '_blank');
    }
  }, []);

  const handleTelegramClick = useCallback(() => {
    if (!isTelegramWebView()) {
      window.open('https://t.me/vanitybox_bot/vanity', '_blank');
    }
  }, []);

  const handlePetraClick = useCallback(() => {
    window.location.href = 'https://petra.app/explore?link=https://vanity.box';
  }, []);

  return (
    <div className="h-screen bg-background flex flex-col relative overflow-hidden">
      <SplashCursor enabled={true} />
      
      {/* Gold border wrapper - fixed position z-50 to appear over everything including infinite menu */}
      <div className="fixed inset-0 border-l-2 border-r-2 border-[#D4AF37] pointer-events-none z-50" />
      
      {/* Content wrapper */}
      <div className="h-screen flex flex-col relative z-40 overflow-hidden">
        {/* Blur overlay when language selector is open */}
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <div className="absolute inset-0" id="page-blur-target"></div>
        </div>
        
        <div className="pointer-events-auto">
          <Header />
        </div>
        
        {/* Hero Section */}
        <main className="flex-1 px-4 pt-20 pb-2 relative z-10 flex flex-col items-start justify-start pointer-events-auto overflow-hidden">
          <article className="max-w-2xl mx-auto text-center w-full flex flex-col gap-0">
            <SearchInterface
              onSearchClick={() => setShowMiniApps(false)} 
              onClearSearch={() => setShowMiniApps(true)}
            />

            {/* Footer - Only on Home Page */}
            {showMiniApps && isHomePage && (
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <div className="flex items-center justify-center gap-6">
                  {/* World App Icon */}
                  <button
                    onClick={handleWorldAppClick}
                    className="group relative flex items-center justify-center transition-all duration-300 hover:opacity-80"
                    aria-label="World App"
                  >
                    <div className="rounded-full border border-[#D4AF37] p-1">
                      <div className="rounded-full bg-black p-2">
                        <img 
                          src={worldAppIcon} 
                          alt="World App" 
                          className="w-12 h-12 md:w-16 md:h-16 object-contain transition-transform group-hover:scale-110"
                        />
                      </div>
                    </div>
                  </button>

                  {/* Telegram Icon */}
                  <button
                    onClick={handleTelegramClick}
                    className="group relative flex items-center justify-center transition-all duration-300 hover:opacity-80"
                    aria-label="Telegram"
                  >
                    <div className="rounded-full border border-[#D4AF37] p-1">
                      <div className="rounded-full bg-black p-2">
                        <img 
                          src={telegramIcon} 
                          alt="Telegram" 
                          className="w-12 h-12 md:w-16 md:h-16 object-contain transition-transform group-hover:scale-110"
                        />
                      </div>
                    </div>
                  </button>

                  {/* Petra Icon */}
                  <button
                    onClick={handlePetraClick}
                    className="group relative flex items-center justify-center transition-all duration-300 hover:opacity-80"
                    aria-label="Petra"
                  >
                    <div className="rounded-full border border-[#D4AF37] p-1">
                      <div className="rounded-full bg-black p-2">
                        <img 
                          src={petraIcon} 
                          alt="Petra" 
                          className="w-12 h-12 md:w-16 md:h-16 object-contain transition-transform group-hover:scale-110"
                        />
                      </div>
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
            
            {/* Theme Toggle on Right */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/20 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-black" />
              ) : (
                <Moon className="w-4 h-4 text-black" />
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
});

export default Index;
