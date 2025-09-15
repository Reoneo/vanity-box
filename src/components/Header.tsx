import React, { useState } from 'react';
import { WalletConnection } from './WalletConnection';
import vanityLogo from '../assets/vanity-logo.png';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
export const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="w-full sticky top-0 z-50 relative bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37]">
      {/* Preload the logo */}
      <link rel="preload" as="image" href={vanityLogo} />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-20 flex items-center justify-center">
        {/* Menu Button - Hamburger to X */}
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="absolute left-4 inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-ring transition"
        >
          <div className="relative w-6 h-6">
            <span className={cn("absolute left-0 top-0 w-6 h-0.5 bg-foreground transition-transform duration-300", menuOpen ? "translate-y-2.5 rotate-45" : "translate-y-0")} />
            <span className={cn("absolute left-0 top-2.5 w-6 h-0.5 bg-foreground transition-all duration-300", menuOpen ? "opacity-0" : "opacity-100")} />
            <span className={cn("absolute left-0 top-5 w-6 h-0.5 bg-foreground transition-transform duration-300", menuOpen ? "-translate-y-2.5 -rotate-45" : "translate-y-0")} />
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
        <SheetContent side="right" className="w-80">
          <nav className="mt-8 space-y-4">
            <a href="#" className="block text-foreground hover:underline">Home</a>
            <a href="#" className="block text-foreground hover:underline">Features</a>
            <a href="#" className="block text-foreground hover:underline">Pricing</a>
            <a href="#" className="block text-foreground hover:underline">Contact</a>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};