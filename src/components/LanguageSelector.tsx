import React from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; flag: string }[] = [
    { code: 'en', flag: '🇺🇸' },
    { code: 'ca', flag: '🇪🇸' },
    { code: 'zh-CN', flag: '🇨🇳' },
    { code: 'fr', flag: '🇫🇷' },
    { code: 'de', flag: '🇩🇪' },
    { code: 'hi', flag: '🇮🇳' },
    { code: 'ja', flag: '🇯🇵' },
    { code: 'ko', flag: '🇰🇷' },
    { code: 'pl', flag: '🇵🇱' },
    { code: 'pt', flag: '🇵🇹' },
    { code: 'es', flag: '🇪🇸' },
    { code: 'es-419', flag: '🇲🇽' },
    { code: 'ms', flag: '🇲🇾' },
    { code: 'th', flag: '🇹🇭' },
    { code: 'id', flag: '🇮🇩' },
    { code: 'zh-TW', flag: '🇹🇼' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleCycleLanguage = () => {
    const currentIndex = languages.findIndex(lang => lang.code === language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex].code);
  };

  return (
    <button
      onClick={handleCycleLanguage}
      className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all duration-300 text-lg"
      aria-label="Change language"
      title={`Current: ${currentLanguage?.code}`}
    >
      {currentLanguage?.flag || '🌐'}
    </button>
  );
};