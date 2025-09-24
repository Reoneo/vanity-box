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
      <span className="text-xl md:text-3xl lg:text-4xl xl:text-5xl font-light tracking-wide">Your Personalised Digital ID</span>
    );
  };

  return (
    <h1 className="text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 dark:text-white leading-tight drop-shadow-lg text-center px-4 whitespace-nowrap">
      {getHeaderText()}
    </h1>
  );
};