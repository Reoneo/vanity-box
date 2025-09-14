import React from 'react';
import { WalletConnection } from './WalletConnection';
import { EthereumPattern } from './EthereumPattern';

export const Header: React.FC = () => {
  return (
    <header className="w-full sticky top-0 z-50 relative overflow-hidden bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37]">
      {/* Animated Gold Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] animate-shimmer-slide" />
      <div className="absolute inset-0 bg-gradient-to-45 from-transparent via-white/20 to-transparent animate-shimmer-glow" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-16 flex items-center justify-center">
        {/* Centered Vanity.box Logo */}
        <div className="flex items-center">
          <h1 className="font-playfair text-2xl font-bold text-white tracking-wide drop-shadow-lg">
            Vanity.box
          </h1>
        </div>
        
        {/* Wallet Connection */}
        <div className="absolute right-4 flex items-center">
          <WalletConnection />
        </div>
      </div>
      
      {/* Luxury border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </header>
  );
};