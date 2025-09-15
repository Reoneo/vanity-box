import React from 'react';
import { WalletConnection } from './WalletConnection';
import vanityLogo from '../assets/vanity-logo.png';

export const Header: React.FC = () => {
  return (
    <header className="w-full sticky top-0 z-50 relative bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37]">
      {/* Preload the logo */}
      <link rel="preload" as="image" href={vanityLogo} />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-20 flex items-center justify-center">
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
    </header>
  );
};