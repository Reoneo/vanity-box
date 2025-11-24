import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { LanguageSelector } from '@/components/LanguageSelector';
import SplashCursor from '@/components/SplashCursor';
import { Sun, Moon, User, Inbox, Search } from 'lucide-react';
import patternTiles from '@/assets/pattern-tiles.jpeg';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import Dock from '@/components/Dock';
import { useLanguage } from '@/contexts/LanguageContext';

const Index = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const location = useLocation();
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);
  const [activeDockSection, setActiveDockSection] = useState<'profile' | 'inbox'>('profile');
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [showDock, setShowDock] = useState(true);

  // Listen for wallet connection events
  useEffect(() => {
    const handleWalletChange = (event: CustomEvent) => {
      setUser(event.detail);
    };

    const handleSearchResults = (event: CustomEvent) => {
      // Hide dock when search results are shown, show when cleared
      setShowDock(!event.detail.hasResults);
    };

    window.addEventListener('wallet-connected', handleWalletChange as EventListener);
    window.addEventListener('wallet-disconnected', () => setUser(null));
    window.addEventListener('search-results-changed', handleSearchResults as EventListener);

    return () => {
      window.removeEventListener('wallet-connected', handleWalletChange as EventListener);
      window.removeEventListener('wallet-disconnected', () => setUser(null));
      window.removeEventListener('search-results-changed', handleSearchResults as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <SplashCursor key={theme} enabled={true} />
      
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
        <main className="flex-1 px-4 pt-20 pb-2 relative z-10 flex flex-col items-start justify-start pointer-events-auto">
          <article className="max-w-2xl mx-auto text-center w-full flex flex-col gap-0">
            <SearchInterface />
          </article>
        </main>
        
        {/* Homepage Dock - fixed at bottom, hidden when search results shown */}
        {showDock && (
          <div className="fixed bottom-20 left-0 right-0 flex items-center justify-center pb-4 pt-4 z-[9998] pointer-events-none">
            <div className="pointer-events-auto">
              <Dock
                items={[
                  {
                    icon: <User className="w-6 h-6 text-[#D4AF37]" />,
                    label: t('profile'),
                    onClick: () => {
                      setActiveDockSection('profile');
                      // Navigate to My IDs
                      window.dispatchEvent(new CustomEvent("show-my-ids"));
                    },
                    isActive: activeDockSection === 'profile',
                  },
                  {
                    icon: <Inbox className="w-6 h-6 text-[#D4AF37]" />,
                    label: t('inbox'),
                    onClick: () => {
                      setActiveDockSection('inbox');
                      // Navigate to inbox view (Push messaging)
                      window.location.href = '/inbox';
                    },
                    isActive: activeDockSection === 'inbox',
                  },
                ]}
              />
            </div>
          </div>
        )}
        
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
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
