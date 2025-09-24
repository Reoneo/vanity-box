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
    <h1 className="text-center px-4 mb-4">
      <div className="leading-tight">
        {getHeaderText()}
      </div>
    </h1>
  );
};