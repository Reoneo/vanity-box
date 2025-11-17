import React from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import worldAppIcon from '@/assets/world-app-icon.png';
import telegramIcon from '@/assets/telegram-icon.png';
import { MiniKit } from '@worldcoin/minikit-js';
import { isTelegramWebView } from '@/lib/telegram';

interface PersonalizedHeaderProps {
  user?: {
    username?: string;
    walletAddress?: string;
  } | null;
  isProfileDisplayed?: boolean;
}

export const PersonalizedHeader: React.FC<PersonalizedHeaderProps> = React.memo(({ user, isProfileDisplayed = false }) => {
  const { t } = useLanguage();
  
  const handleWorldAppClick = () => {
    if (!MiniKit.isInstalled()) {
      window.open('https://world.org/ecosystem/app_ed7e61cb0c52630464178eed59e3fbdd', '_blank');
    } else {
      // Already in World App, do nothing or show a message
      console.log('Already in World App');
    }
  };

  const handleTelegramClick = () => {
    if (!isTelegramWebView()) {
      window.open('https://t.me/vanitybox_bot/vanity', '_blank');
    } else {
      // Already in Telegram, do nothing or show a message
      console.log('Already in Telegram');
    }
  };

  const getHeaderText = () => {
    console.log('PersonalizedHeader rendering with user:', user);
    // Always show the same text regardless of connection status
    return (
      <span className="font-playfair text-xl md:text-2xl lg:text-3xl font-semibold tracking-wide text-black dark:text-white whitespace-nowrap">
        Register
      </span>
    );
  };

  return (
    <div className="text-center px-2 mb-0.5">
      <h1 className="leading-tight mb-0">
        {getHeaderText()}
      </h1>
    </div>
  );
});