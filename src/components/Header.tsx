import React from 'react';
import { WalletConnection } from './WalletConnection';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header 
      className="w-full border-b border-border/50 sticky top-0 z-50"
      style={{
        backgroundImage: `url('/pattern-bg.jpeg')`,
        backgroundRepeat: 'repeat',
        backgroundSize: '120px 64px',
        backgroundPosition: 'left center'
      }}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-end">
        {/* Wallet Connection */}
        <div className="flex items-center gap-2">
          <WalletConnection />
        </div>
      </div>
    </header>
  );
};