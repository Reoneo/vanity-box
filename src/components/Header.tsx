import React from 'react';
import { WalletConnection } from './WalletConnection';
import luxuryPattern from '../assets/luxury-pattern.jpeg';

export const Header: React.FC = () => {
  return (
    <header className="w-full sticky top-0 z-50 relative bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37]">
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-16 flex items-center">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <img 
            src={luxuryPattern} 
            alt="Luxury Pattern" 
            className="w-8 h-8 object-cover rounded"
          />
          <h1 className="font-playfair text-2xl font-bold text-white tracking-wide drop-shadow-lg">
            Vanity.box
          </h1>
        </div>
        
        {/* Wallet Connection */}
        <div className="ml-auto flex items-center">
          <WalletConnection />
        </div>
      </div>
    </header>
  );
};