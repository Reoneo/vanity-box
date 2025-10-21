import React, { useState } from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const languages: { code: Language; flag: string; icon: string }[] = [
    { code: 'en', flag: '🇬🇧', icon: 'https://flagcdn.com/w80/gb.png' },
    { code: 'ca', flag: 'CAT', icon: 'https://flagcdn.com/w80/es-ct.png' },
    { code: 'zh-CN', flag: '🇨🇳', icon: 'https://flagcdn.com/w80/cn.png' },
    { code: 'fr', flag: '🇫🇷', icon: 'https://flagcdn.com/w80/fr.png' },
    { code: 'de', flag: '🇩🇪', icon: 'https://flagcdn.com/w80/de.png' },
    { code: 'hi', flag: '🇮🇳', icon: 'https://flagcdn.com/w80/in.png' },
    { code: 'ja', flag: '🇯🇵', icon: 'https://flagcdn.com/w80/jp.png' },
    { code: 'ko', flag: '🇰🇷', icon: 'https://flagcdn.com/w80/kr.png' },
    { code: 'pl', flag: '🇵🇱', icon: 'https://flagcdn.com/w80/pl.png' },
    { code: 'pt', flag: '🇵🇹', icon: 'https://flagcdn.com/w80/pt.png' },
    { code: 'es', flag: '🇪🇸', icon: 'https://flagcdn.com/w80/es.png' },
    { code: 'es-419', flag: '🇲🇽', icon: 'https://flagcdn.com/w80/mx.png' },
    { code: 'ms', flag: '🇲🇾', icon: 'https://flagcdn.com/w80/my.png' },
    { code: 'th', flag: '🇹🇭', icon: 'https://flagcdn.com/w80/th.png' },
    { code: 'id', flag: '🇮🇩', icon: 'https://flagcdn.com/w80/id.png' },
    { code: 'zh-TW', flag: '🇹🇼', icon: 'https://flagcdn.com/w80/tw.png' },
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
          className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 bg-black/10 hover:bg-black/20 transition-all duration-300"
          aria-label="Change language"
          title={`Current: ${currentLanguage?.code}`}
        >
          <img 
            src={currentLanguage?.icon || 'https://flagcdn.com/w80/un.png'} 
            alt={currentLanguage?.code}
            className="w-full h-full object-cover"
          />
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
                <img 
                  src={lang.icon} 
                  alt={lang.code}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-xs">{lang.code}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};