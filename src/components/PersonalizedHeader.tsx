import React from 'react';
import { Clock } from 'lucide-react';

interface PersonalizedHeaderProps {
  user?: {
    username?: string;
    walletAddress?: string;
  } | null;
}

export const PersonalizedHeader: React.FC<PersonalizedHeaderProps> = ({ user }) => {
  const getHeaderText = () => {
    console.log('PersonalizedHeader rendering with user:', user);
    // Always show the same text regardless of connection status
    return (
      <span className="font-playfair text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-wide bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent">
        Your Personalised Digital ID
      </span>
    );
  };

  return (
    <h1 className="relative text-center px-4 mb-8">
      {/* Glow effect behind text */}
      <div className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] rounded-2xl transform scale-110" />
      
      {/* Main heading with luxury styling */}
      <div className="relative z-10 leading-tight drop-shadow-2xl">
        {getHeaderText()}
      </div>
      
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse rounded-xl" />
    </h1>
  );
};