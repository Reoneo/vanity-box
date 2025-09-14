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
        {/* Centered Vanity.box Logo with Gold Animation */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
          <div className="relative px-6 py-2 rounded-lg overflow-hidden">
            {/* Animated Gold Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] animate-shimmer-slide" />
            <div className="absolute inset-0 bg-gradient-to-45 from-transparent via-white/20 to-transparent animate-shimmer-glow" />
            
            {/* Logo Text */}
            <h1 className="relative font-playfair text-2xl font-bold text-white tracking-wide drop-shadow-lg">
              Vanity.box
            </h1>
          </div>
        </div>
        
        {/* Wallet Connection */}
        <div className="flex items-center gap-2 ml-auto">
          <WalletConnection />
        </div>
      </div>
      
      {/* Luxury border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </header>
  );
};