import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

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

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-playfair font-semibold text-gray-900 dark:text-white">
        {t('language')}
      </h3>
      
      {/* Current Language Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black shadow-md flex items-center justify-between transition-all duration-200"
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{currentLanguage?.nativeName}</span>
          <span className="text-xs opacity-70">{currentLanguage?.name}</span>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 transition-transform duration-200",
          isExpanded && "rotate-180"
        )} />
      </button>

      {/* Language List */}
      {isExpanded && (
        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent animate-in slide-in-from-top-2 duration-200">
          {languages.filter(lang => lang.code !== language).map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsExpanded(false);
              }}
              className="w-full text-left px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{lang.nativeName}</span>
                <span className="text-xs opacity-60 text-gray-600 dark:text-gray-400">
                  {lang.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};