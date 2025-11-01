import React, { useState, useEffect } from 'react';
import { WalletConnection } from './WalletConnection';
import { SpotifyPauseButton } from './SpotifyPauseButton';
import vanityLogo from '../assets/vanity-logo.png';
import vanityContactIcon from '../assets/vanity-contact-icon.png';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Search, Mail, Send, Linkedin, Twitter, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearchIcon, setShowSearchIcon] = useState(false);
  const [isMintWindowOpen, setIsMintWindowOpen] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [showMyIds, setShowMyIds] = useState(false);
  const [isProfileDisplayed, setIsProfileDisplayed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show search icon when user has scrolled past the search bar area
      const searchBarArea = 200; // Approximate height where search bar becomes out of view
      setShowSearchIcon(window.scrollY > searchBarArea);
    };

    const handleMintOpen = () => setIsMintWindowOpen(true);
    const handleMintClose = () => setIsMintWindowOpen(false);
    
    const handleWalletConnected = () => setIsWalletConnected(true);
    const handleWalletDisconnected = () => setIsWalletConnected(false);
    
    const handleShowMyIds = () => setShowMyIds(true);
    const handleHideMyIds = () => setShowMyIds(false);
    
    const handleProfileDisplayed = () => setIsProfileDisplayed(true);
    const handleProfileHidden = () => setIsProfileDisplayed(false);

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mint-window-open', handleMintOpen);
    window.addEventListener('mint-window-close', handleMintClose);
    window.addEventListener('wallet-connected', handleWalletConnected);
    window.addEventListener('wallet-disconnected', handleWalletDisconnected);
    window.addEventListener('show-my-ids', handleShowMyIds);
    window.addEventListener('back-to-domains', handleHideMyIds);
    window.addEventListener('profile-displayed', handleProfileDisplayed);
    window.addEventListener('profile-hidden', handleProfileHidden);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mint-window-open', handleMintOpen);
      window.removeEventListener('mint-window-close', handleMintClose);
      window.removeEventListener('wallet-connected', handleWalletConnected);
      window.removeEventListener('wallet-disconnected', handleWalletDisconnected);
      window.removeEventListener('show-my-ids', handleShowMyIds);
      window.removeEventListener('back-to-domains', handleHideMyIds);
      window.removeEventListener('profile-displayed', handleProfileDisplayed);
      window.removeEventListener('profile-hidden', handleProfileHidden);
    };
  }, []);

  const scrollToSearch = () => {
    // If mint window is open, just close it and stay on search results
    if (isMintWindowOpen) {
      window.dispatchEvent(new Event('mint-window-close'));
      setIsMintWindowOpen(false);
      return;
    }
    
    // Otherwise, reset to main page state
    setShowMyIds(false);
    window.dispatchEvent(new Event('back-to-domains'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const TriggerOrClose = menuOpen ? SheetClose : SheetTrigger;
  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <header className="fixed top-0 left-0 right-0 z-[100] w-full bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] pt-safe-area-inset-top">
        {/* Preload the logo */}
        <link rel="preload" as="image" href={vanityLogo} />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 h-20 flex items-center justify-between">
          {/* Mobile: Show left-aligned controls when wallet is connected */}
          {isWalletConnected && (
            <div className="flex items-center gap-1 md:hidden">
              {/* Logo - positioned at far left, moved slightly left, with Home Button */}
              <button
                onClick={() => window.location.reload()}
                className="flex items-center -ml-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img 
                  src={vanityLogo} 
                  alt="Vanity.box Logo" 
                  className="h-24 w-auto object-contain transform scale-100"
                  loading="eager"
                  fetchPriority="high"
                  style={{ marginTop: '2px', marginBottom: '2px' }}
                />
              </button>

              {/* Menu Button */}
              <TriggerOrClose asChild>
                <button
                  type="button"
                  aria-label="Toggle menu"
                  className="w-10 h-10 flex items-center justify-center bg-transparent transition-all duration-300"
                >
                  <div className="relative w-5 h-5">
                    <span className="absolute left-0 top-0 w-5 h-0.5 bg-black" />
                    <span className="absolute left-0 top-2 w-5 h-0.5 bg-black" />
                    <span className="absolute left-0 top-4 w-5 h-0.5 bg-black" />
                  </div>
                </button>
              </TriggerOrClose>

              {/* Spotify Pause & Search Icon - only show when scrolled, NOT on mint or my ids or profile pages */}
              {showSearchIcon && !isMintWindowOpen && !showMyIds && !isProfileDisplayed && (
                <>
                  <SpotifyPauseButton />
                  <button
                    type="button"
                    aria-label="Scroll to search"
                    onClick={scrollToSearch}
                    className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-black/10 rounded-md transition-all duration-300"
                  >
                    <Search className="w-5 h-5 text-black" />
                  </button>
                </>
              )}
              
              {/* Spotify Pause when search icon is not visible */}
              {!showSearchIcon && (
                <SpotifyPauseButton />
              )}
            </div>
          )}

          {/* Mobile: Show centered logo when wallet is NOT connected (desktop/tablet mode) */}
          {!isWalletConnected && (
            <>
              {/* Left Side Controls */}
              <div className="flex items-center gap-2 md:hidden">
                <TriggerOrClose asChild>
                  <button
                    type="button"
                    aria-label="Toggle menu"
                    className="w-10 h-10 flex items-center justify-center bg-transparent transition-all duration-300"
                  >
                    <div className="relative w-5 h-5">
                      <span className="absolute left-0 top-0 w-5 h-0.5 bg-black" />
                      <span className="absolute left-0 top-2 w-5 h-0.5 bg-black" />
                      <span className="absolute left-0 top-4 w-5 h-0.5 bg-black" />
                    </div>
                  </button>
                </TriggerOrClose>

            {/* Spotify Pause & Search Icon - only show when scrolled, NOT on mint or my ids or profile pages */}
            {showSearchIcon && !isMintWindowOpen && !showMyIds && !isProfileDisplayed && (
              <>
                <SpotifyPauseButton />
                <button
                  type="button"
                  aria-label="Scroll to search"
                  onClick={scrollToSearch}
                  className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-black/10 rounded-md transition-all duration-300"
                >
                  <Search className="w-5 h-5 text-black" />
                </button>
              </>
            )}
            
            {/* Spotify Pause when search icon is not visible */}
            {!showSearchIcon && (
              <SpotifyPauseButton />
            )}
              </div>

              {/* Centered Logo (Mobile when wallet disconnected) with Home Button */}
              <button
                onClick={() => window.location.reload()}
                className="flex items-center absolute left-1/2 transform -translate-x-1/2 md:hidden cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img 
                  src={vanityLogo} 
                  alt="Vanity.box Logo" 
                  className="h-20 w-auto object-contain"
                  loading="eager"
                  fetchPriority="high"
                />
              </button>
            </>
          )}

          {/* Desktop/Tablet: Left Side Controls */}
          <div className="hidden md:flex items-center gap-2">
            <TriggerOrClose asChild>
              <button
                type="button"
                aria-label="Toggle menu"
                className="w-10 h-10 flex items-center justify-center bg-transparent transition-all duration-300"
              >
                <div className="relative w-5 h-5">
                  <span className="absolute left-0 top-0 w-5 h-0.5 bg-black" />
                  <span className="absolute left-0 top-2 w-5 h-0.5 bg-black" />
                  <span className="absolute left-0 top-4 w-5 h-0.5 bg-black" />
                </div>
              </button>
            </TriggerOrClose>

            {/* Spotify Pause & Search Icon - only show when scrolled, NOT on mint or my ids or profile pages */}
            {showSearchIcon && !isMintWindowOpen && !showMyIds && !isProfileDisplayed && (
              <>
                <SpotifyPauseButton />
                <button
                  type="button"
                  aria-label="Scroll to search"
                  onClick={scrollToSearch}
                  className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-black/10 rounded-md transition-all duration-300"
                >
                  <Search className="w-5 h-5 text-black" />
                </button>
              </>
            )}
            
            {/* Spotify Pause when search icon is not visible */}
            {!showSearchIcon && (
              <SpotifyPauseButton />
            )}
          </div>

          {/* Desktop/Tablet: Centered Logo with Home Button */}
          <button
            onClick={() => window.location.reload()}
            className="hidden md:flex items-center absolute left-1/2 transform -translate-x-1/2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src={vanityLogo} 
              alt="Vanity.box Logo" 
              className="h-20 w-auto object-contain"
              loading="eager"
              fetchPriority="high"
            />
          </button>

          
          {/* Wallet Connection - Right Side */}
          <div className="flex items-center">
            <WalletConnection />
          </div>
        </div>
      </header>

      {/* Slide-over Menu */}
      <SheetContent side="left" className="w-[85vw] max-w-sm bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 pt-24 overflow-y-auto">
        <nav className="space-y-6">
          
          {/* Legal Links */}
          <div className="space-y-3">
            <h3 className="text-xl font-playfair font-semibold text-gray-900 dark:text-white">Legal</h3>
            <div className="flex flex-col gap-3">
              <Link 
                to="/privacy-policy"
                onClick={() => setMenuOpen(false)}
                className="h-14 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black flex items-center justify-between transition-all duration-300 hover:shadow-lg"
              >
                <span className="font-medium">Privacy Policy</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/terms-of-use"
                onClick={() => setMenuOpen(false)}
                className="h-14 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black flex items-center justify-between transition-all duration-300 hover:shadow-lg"
              >
                <span className="font-medium">Terms of Use</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-xl font-playfair font-semibold text-gray-900 dark:text-white">Contact</h3>
            <div className="flex items-center gap-4">
              <a 
                href="https://vanity.box/vanity.box"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
                aria-label="Vanity.box"
              >
                <img 
                  src={vanityContactIcon} 
                  alt="Vanity.box" 
                  className="w-6 h-6 rounded-full object-cover"
                />
              </a>
              <a 
                href="mailto:R@vanity.box"
                className="hover:scale-110 transition-transform duration-200"
                aria-label="Email"
              >
                <Mail className="w-6 h-6 text-[#D4AF37]" />
              </a>
              <a 
                href="https://t.me/portofspain"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
                aria-label="Telegram"
              >
                <Send className="w-6 h-6 text-[#D4AF37]" />
              </a>
              <a 
                href="https://www.linkedin.com/company/105790273/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-6 h-6 text-[#D4AF37]" />
              </a>
              <a 
                href="https://twitter.com/smithdotbox"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-200"
                aria-label="Twitter"
              >
                <Twitter className="w-6 h-6 text-[#D4AF37]" />
              </a>
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};