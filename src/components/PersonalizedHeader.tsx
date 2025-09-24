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
      <span className="font-playfair text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-wide text-black dark:text-white">
        Your Personalised Digital ID
      </span>
    );
  };

  return (
    <h1 className="relative text-center px-4 mb-4">
      {/* Glow effect behind text - only in light mode */}
      <div className="absolute inset-0 blur-2xl opacity-20 bg-gradient-to-r from-gray-600 via-gray-300 to-gray-600 rounded-2xl transform scale-110 dark:opacity-0" />
      
      {/* Main heading with luxury styling */}
      <div className="relative z-10 leading-tight drop-shadow-2xl">
        {getHeaderText()}
      </div>
      
      {/* Subtle shimmer effect - only in light mode */}
      <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-gray-200 to-transparent animate-pulse rounded-xl dark:opacity-0" />
    </h1>
  );
};