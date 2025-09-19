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
    if (user?.username) {
      return (
        <>
          <span className="text-lg md:text-2xl lg:text-3xl xl:text-4xl">Hello </span>
          <span className="text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold text-[#D4AF37]">{user.username}</span>
          <span className="text-lg md:text-2xl lg:text-3xl xl:text-4xl">, Your Personalised Digital ID</span>
        </>
      );
    }
    return (
      <span className="text-lg md:text-2xl lg:text-3xl xl:text-4xl">Your Personalised Digital ID</span>
    );
  };

  return (
    <h1 className="text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 dark:text-white leading-tight drop-shadow-lg text-center px-4 whitespace-nowrap">
      {getHeaderText()}
    </h1>
  );
};