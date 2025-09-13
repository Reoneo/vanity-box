import React from 'react';
import { WalletConnection } from './WalletConnection';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header 
      className="w-full border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50"
      style={{
        backgroundImage: `url('/pattern-bg.jpeg')`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: 'auto 100%',
        backgroundPosition: 'center'
      }}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
        
        {/* Centered Logo Text */}
        <div className="flex-1 flex justify-center relative z-10">
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Vanity.₿ox
          </span>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center gap-2 relative z-10">
          <WalletConnection />
        </div>
      </div>
    </header>
  );
};