import React from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PersonalizedHeaderProps {
  user?: {
    username?: string;
    walletAddress?: string;
  } | null;
}

export const PersonalizedHeader: React.FC<PersonalizedHeaderProps> = ({ user }) => {
  const { t } = useLanguage();
  
  const getHeaderText = () => {
    console.log('PersonalizedHeader rendering with user:', user);
    // Always show the same text regardless of connection status
    return (
      <span className="font-playfair text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold tracking-wide text-black dark:text-white whitespace-nowrap">
        {t('your_personalized_digital_id')}
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