import React, { useState, useEffect } from 'react';
import { WalletConnection } from './WalletConnection';
import vanityLogo from '../assets/vanity-logo.png';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</h3>
      <div className="flex gap-2">
        <Button
          variant={theme === 'light' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme('light')}
          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-500"
        >
          <Sun className="w-4 h-4" />
          Light
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme('dark')}
          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-500"
        >
          <Moon className="w-4 h-4" />
          Dark
        </Button>
      </div>
    </div>
  );
};
export const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearchIcon, setShowSearchIcon] = useState(false);
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Show search icon when user has scrolled past the search bar area
      const searchBarArea = 200; // Approximate height where search bar becomes out of view
      setShowSearchIcon(window.scrollY > searchBarArea);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const scrollToSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isMobile = window.innerWidth < 768;
  const isWalletConnected = !!user;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37]">
      {/* Preload the logo */}
      <link rel="preload" as="image" href={vanityLogo} />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Mobile Layout when wallet is connected */}
        {isMobile && isWalletConnected ? (
          <>
            {/* Left side: Logo → Menu → Search Icon (when visible) */}
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="flex items-center">
                <img 
                  src={vanityLogo} 
                  alt="Vanity.box Logo" 
                  className="h-12 w-auto object-contain"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              
              {/* Menu Button */}
              <button
                type="button"
                aria-label="Toggle menu"
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "w-10 h-10 flex items-center justify-center transition-all duration-300",
                  menuOpen 
                    ? "bg-gold rounded-md" 
                    : "bg-transparent"
                )}
              >
                <div className="relative w-5 h-5">
                  <span className={cn(
                    "absolute left-0 top-0 w-5 h-0.5 transition-transform duration-300",
                    menuOpen 
                      ? "translate-y-2 rotate-45 bg-white" 
                      : "translate-y-0 bg-black"
                  )} />
                  <span className={cn(
                    "absolute left-0 top-2 w-5 h-0.5 transition-all duration-300",
                    menuOpen 
                      ? "opacity-0 bg-white" 
                      : "opacity-100 bg-black"
                  )} />
                  <span className={cn(
                    "absolute left-0 top-4 w-5 h-0.5 transition-transform duration-300",
                    menuOpen 
                      ? "-translate-y-2 -rotate-45 bg-white" 
                      : "translate-y-0 bg-black"
                  )} />
                </div>
              </button>
              
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
            
            {/* Right side: Wallet Connection */}
            <div className="flex items-center">
              <WalletConnection />
            </div>
          </>
        ) : (
          <>
            {/* Desktop Layout or Mobile without wallet */}
            {/* Menu Button - Gold background with white X when open */}
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "absolute left-4 w-10 h-10 flex items-center justify-center transition-all duration-300",
                menuOpen 
                  ? "bg-gold rounded-md" 
                  : "bg-transparent"
              )}
            >
              <div className="relative w-5 h-5">
                <span className={cn(
                  "absolute left-0 top-0 w-5 h-0.5 transition-transform duration-300",
                  menuOpen 
                    ? "translate-y-2 rotate-45 bg-white" 
                    : "translate-y-0 bg-black"
                )} />
                <span className={cn(
                  "absolute left-0 top-2 w-5 h-0.5 transition-all duration-300",
                  menuOpen 
                    ? "opacity-0 bg-white" 
                    : "opacity-100 bg-black"
                )} />
                <span className={cn(
                  "absolute left-0 top-4 w-5 h-0.5 transition-transform duration-300",
                  menuOpen 
                    ? "-translate-y-2 -rotate-45 bg-white" 
                    : "translate-y-0 bg-black"
                )} />
              </div>
            </button>

            {/* Search Icon - appears when search bar is out of view */}
            {showSearchIcon && (
              <button
                type="button"
                aria-label="Scroll to search"
                onClick={scrollToSearch}
                className="absolute left-16 w-10 h-10 flex items-center justify-center bg-transparent hover:bg-black/10 rounded-md transition-all duration-300"
              >
                <Search className="w-5 h-5 text-black" />
              </button>
            )}

            {/* Centered Logo */}
            <div className="flex items-center mx-auto">
              <img 
                src={vanityLogo} 
                alt="Vanity.box Logo" 
                className="h-20 w-auto object-contain"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            
            {/* Wallet Connection */}
            <div className="absolute right-4 flex items-center">
              <WalletConnection />
            </div>
          </>
        )}
      </div>

      {/* Slide-over Menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 bg-white dark:bg-[#334155] border-gray-200 dark:border-gray-600">
          <nav className="mt-8 space-y-4">
            <ThemeToggle />
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};