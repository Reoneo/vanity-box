import React from 'react';
import { WalletConnection } from './WalletConnection';
import { EthereumPattern } from './EthereumPattern';

export const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-[#D4AF37]/20 sticky top-0 z-50 relative overflow-hidden">
      {/* Luxury Ethereum Pattern Background */}
      <EthereumPattern />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Vanity.box Logo */}
        <div className="flex items-center">
          <h1 className="font-playfair text-2xl font-semibold text-white tracking-wide">
            Vanity.box
          </h1>
        </div>
        
        {/* Wallet Connection */}
        <div className="flex items-center gap-2">
          <WalletConnection />
        </div>
      </div>
      
      {/* Luxury border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </header>
  );
};