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

export const PersonalizedHeader: React.FC<PersonalizedHeaderProps> = ({ user, isProfileDisplayed = false }) => {
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
      <span className="font-playfair text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold tracking-wide text-black dark:text-white whitespace-nowrap">
        {t('your_digital_id')}
      </span>
    );
  };

  return (
    <div className="text-center px-4 mb-4">
      <h1 className="leading-tight mb-6">
        {getHeaderText()}
      </h1>
      
      {/* Mini Apps Section */}
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-sm md:text-base font-semibold text-[#D4AF37] tracking-wider uppercase">
          Mini Apps
        </h2>
        <div className="flex items-center justify-center gap-6">
          {/* World App Icon */}
          <button
            onClick={handleWorldAppClick}
            className="group relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/20 hover:bg-black/30 transition-all duration-300 border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            aria-label="World App"
          >
            <img 
              src={worldAppIcon} 
              alt="World App" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain transition-transform group-hover:scale-110"
            />
          </button>

          {/* Telegram Icon */}
          <button
            onClick={handleTelegramClick}
            className="group relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/20 hover:bg-black/30 transition-all duration-300 border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            aria-label="Telegram"
          >
            <img 
              src={telegramIcon} 
              alt="Telegram" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain transition-transform group-hover:scale-110"
            />
          </button>
        </div>
      </div>
    </div>
  );
};