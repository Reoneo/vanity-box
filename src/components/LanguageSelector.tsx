import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: t('english'), nativeName: 'English' },
    { code: 'ca', name: t('catalan'), nativeName: 'Català' },
    { code: 'zh-CN', name: t('chinese_simplified'), nativeName: '简体中文' },
    { code: 'fr', name: t('french'), nativeName: 'Français' },
    { code: 'de', name: t('german'), nativeName: 'Deutsch' },
    { code: 'hi', name: t('hindi'), nativeName: 'हिंदी' },
    { code: 'ja', name: t('japanese'), nativeName: '日本語' },
    { code: 'ko', name: t('korean'), nativeName: '한국어' },
    { code: 'pl', name: t('polish'), nativeName: 'Polski' },
    { code: 'pt', name: t('portuguese'), nativeName: 'Português' },
    { code: 'es', name: t('spanish'), nativeName: 'Español' },
    { code: 'es-419', name: t('spanish_latin_america'), nativeName: 'Español (Latinoamérica)' },
    { code: 'ms', name: t('malay'), nativeName: 'Bahasa Melayu' },
    { code: 'th', name: t('thai'), nativeName: 'ไทย' },
    { code: 'id', name: t('indonesian'), nativeName: 'Bahasa Indonesia' },
    { code: 'zh-TW', name: t('traditional_chinese_taiwan'), nativeName: '繁體中文' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-playfair font-semibold text-gray-900 dark:text-white">
        {t('language')}
      </h3>
      <div className="grid grid-cols-1 gap-1.5 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group hover:scale-[1.02]",
              language === lang.code
                ? "bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black font-medium shadow-md border-2 border-[#D4AF37]"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 hover:border-[#D4AF37] hover:shadow-sm"
            )}
          >
            <div className="flex flex-col min-w-0 flex-1">
              <span className={cn(
                "text-sm font-medium truncate",
                language === lang.code ? "text-black" : "text-gray-900 dark:text-gray-100"
              )}>{lang.nativeName}</span>
              {language !== lang.code && (
                <span className={cn(
                  "text-xs opacity-70 truncate",
                  "text-gray-600 dark:text-gray-400"
                )}>{lang.name}</span>
              )}
            </div>
            {language === lang.code && (
              <Check className="w-5 h-5 text-black flex-shrink-0 ml-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};