import React, { useState } from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const languages: { code: Language; flag: string }[] = [
    { code: 'en', flag: '🇬🇧' },
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

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all duration-300 text-2xl overflow-hidden border-2 border-white/30"
          aria-label="Change language"
          title={`Current: ${currentLanguage?.code}`}
        >
          <span className="block w-full h-full flex items-center justify-center scale-[2]">
            {currentLanguage?.flag || '🌐'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-4 bg-white dark:bg-gray-900 backdrop-blur-sm border border-[#D4AF37]/20 shadow-xl z-[10000]"
        align="start"
        side="top"
        sideOffset={10}
      >
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Select Language</h3>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md transition-all text-left",
                  language === lang.code
                    ? "bg-[#D4AF37] text-black font-medium"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="text-xs">{lang.code}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};