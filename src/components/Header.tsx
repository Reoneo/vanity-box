import React, { useState } from 'react';
import { WalletConnection } from './WalletConnection';
import vanityLogo from '../assets/vanity-logo.png';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Theme</h3>
      <div className="flex gap-2">
        <Button
          variant={theme === 'light' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme('light')}
          className="flex items-center gap-2"
        >
          <Sun className="w-4 h-4" />
          Light
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme('dark')}
          className="flex items-center gap-2"
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
  return (
    <header className="w-full sticky top-0 z-50 relative bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37]">
      {/* Preload the logo */}
      <link rel="preload" as="image" href={vanityLogo} />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-20 flex items-center justify-center">
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

        {/* Centered Logo */}
        <div className="flex items-center">
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
      </div>

      {/* Slide-over Menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 bg-background border-border">
          <nav className="mt-8 space-y-4">
            <ThemeToggle />
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};