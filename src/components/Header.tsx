import React, { useState, useEffect } from 'react';
import { WalletConnection } from './WalletConnection';
import { LanguageSelector } from './LanguageSelector';
import vanityLogo from '../assets/vanity-logo.png';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-playfair font-semibold text-gray-900 dark:text-white">{t('theme')}</h3>
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setTheme('light')}
          className={cn(
            "w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 transform active:scale-95",
            theme === 'light'
              ? "bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black shadow-lg border-2 border-[#D4AF37] scale-110"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-[#D4AF37] hover:bg-gradient-to-r hover:from-[#D4AF37]/10 hover:to-[#F4E4BC]/10 hover:scale-105"
          )}
        >
          <Sun className={cn(
            "transition-all duration-300",
            theme === 'light' ? "w-8 h-8 rotate-180" : "w-7 h-7"
          )} />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={cn(
            "w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 transform active:scale-95",
            theme === 'dark'
              ? "bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black shadow-lg border-2 border-[#D4AF37] scale-110"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-[#D4AF37] hover:bg-gradient-to-r hover:from-[#D4AF37]/10 hover:to-[#F4E4BC]/10 hover:scale-105"
          )}
        >
          <Moon className={cn(
            "transition-all duration-300",
            theme === 'dark' ? "w-8 h-8 rotate-12" : "w-7 h-7"
          )} />
        </button>
      </div>
    </div>
  );
};
export const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearchIcon, setShowSearchIcon] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show search icon when user has scrolled past the search bar area
      const searchBarArea = 200; // Approximate height where search bar becomes out of view
      setShowSearchIcon(window.scrollY > searchBarArea);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const TriggerOrClose = menuOpen ? SheetClose : SheetTrigger;
  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <header className="fixed top-0 left-0 right-0 z-[9999] w-full bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] pt-safe-area-inset-top">
        {/* Preload the logo */}
        <link rel="preload" as="image" href={vanityLogo} />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 h-20 flex items-center justify-between md:justify-center">
          {/* Mobile: Logo, Menu Button, and Search Icon on left */}
          <div className="flex items-center gap-1 md:hidden">
            {/* Logo - positioned at far left, moved slightly left */}
            <div className="flex items-center -ml-2">
              <img 
                src={vanityLogo} 
                alt="Vanity.box Logo" 
                className="h-24 w-auto object-contain transform scale-100"
                loading="eager"
                fetchPriority="high"
                style={{ marginTop: '2px', marginBottom: '2px' }}
              />
            </div>

            {/* Menu Button */}
            <TriggerOrClose asChild>
              <button
                type="button"
                aria-label="Toggle menu"
                className={cn(
                  "w-10 h-10 flex items-center justify-center transition-all duration-300",
                  menuOpen 
                    ? "bg-gold rounded-md relative z-[10001]" 
                    : "bg-transparent"
                )}
              >
                <div className="relative w-5 h-5">
                  <span className={cn(
                    "absolute left-0 top-0 w-5 h-0.5 transition-transform duration-300",
                    menuOpen 
                      ? "translate-y-2 rotate-45 bg-black" 
                      : "translate-y-0 bg-black"
                  )} />
                  <span className={cn(
                    "absolute left-0 top-2 w-5 h-0.5 transition-all duration-300",
                    menuOpen 
                      ? "opacity-0 bg-black" 
                      : "opacity-100 bg-black"
                  )} />
                  <span className={cn(
                    "absolute left-0 top-4 w-5 h-0.5 transition-transform duration-300",
                    menuOpen 
                      ? "-translate-y-2 -rotate-45 bg-black" 
                      : "translate-y-0 bg-black"
                  )} />
                </div>
              </button>
            </TriggerOrClose>

            {/* Search Icon - appears when search bar is out of view */}
            {showSearchIcon && (
              <button
                type="button"
                aria-label="Scroll to search"
                onClick={scrollToSearch}
                className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-black/10 rounded-md transition-all duration-300"
              >
                <Search className="w-5 h-5 text-black" />
              </button>
            )}
          </div>

          {/* Desktop/Tablet: Menu Button on left */}
          <TriggerOrClose asChild>
            <button
              type="button"
              aria-label="Toggle menu"
              className={cn(
                "hidden md:flex absolute left-4 w-10 h-10 items-center justify-center transition-all duration-300",
                menuOpen 
                  ? "bg-gold rounded-md relative z-[10001]" 
                  : "bg-transparent"
              )}
            >
              <div className="relative w-5 h-5">
                <span className={cn(
                  "absolute left-0 top-0 w-5 h-0.5 transition-transform duration-300",
                  menuOpen 
                    ? "translate-y-2 rotate-45 bg-black" 
                    : "translate-y-0 bg-black"
                )} />
                <span className={cn(
                  "absolute left-0 top-2 w-5 h-0.5 transition-all duration-300",
                  menuOpen 
                    ? "opacity-0 bg-black" 
                    : "opacity-100 bg-black"
                )} />
                <span className={cn(
                  "absolute left-0 top-4 w-5 h-0.5 transition-transform duration-300",
                  menuOpen 
                    ? "-translate-y-2 -rotate-45 bg-black" 
                    : "translate-y-0 bg-black"
                )} />
              </div>
            </button>
          </TriggerOrClose>

          {/* Desktop/Tablet: Search Icon next to menu button */}
          {showSearchIcon && (
            <button
              type="button"
              aria-label="Scroll to search"
              onClick={scrollToSearch}
              className="hidden md:flex absolute left-16 w-10 h-10 items-center justify-center bg-transparent hover:bg-black/10 rounded-md transition-all duration-300"
            >
              <Search className="w-5 h-5 text-black" />
            </button>
          )}

          {/* Desktop/Tablet: Centered Logo */}
          <div className="hidden md:flex items-center">
            <img 
              src={vanityLogo} 
              alt="Vanity.box Logo" 
              className="h-20 w-auto object-contain"
              loading="eager"
              fetchPriority="high"
            />
          </div>

          
          {/* Wallet Connection */}
          <div className="flex items-center md:absolute md:right-4">
            <WalletConnection />
          </div>
        </div>
      </header>

      {/* Slide-over Menu */}
      <SheetContent side="left" className="w-[65vw] max-w-md bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 pt-28">
        {/* Close button */}
        <SheetClose asChild>
          <button
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 z-50"
            aria-label="Close menu"
          >
            <div className="relative w-5 h-5">
              <span className="absolute w-5 h-0.5 bg-white top-1/2 left-0 transform -translate-y-1/2 rotate-45" />
              <span className="absolute w-5 h-0.5 bg-white top-1/2 left-0 transform -translate-y-1/2 -rotate-45" />
            </div>
          </button>
        </SheetClose>
        
        <nav className="space-y-6">
          <ThemeToggle />
          <LanguageSelector />
        </nav>
      </SheetContent>
    </Sheet>
  );
};