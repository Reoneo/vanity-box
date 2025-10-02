import React, { useState } from 'react';
import { Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [showLanguagePanel, setShowLanguagePanel] = useState(false);

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
    <>
      {/* Main Language Button */}
      {!showLanguagePanel && (
        <div className="space-y-3">
          <h3 className="text-xl font-playfair font-semibold text-gray-900 dark:text-white">
            {t('language')}
          </h3>
          
          <button
            onClick={() => setShowLanguagePanel(true)}
            className={cn(
              "w-full px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group",
              "bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black shadow-lg"
            )}
          >
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{currentLanguage?.nativeName}</span>
              <span className="text-xs opacity-70">{currentLanguage?.name}</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      )}

      {/* Full Language Selection Panel */}
      {showLanguagePanel && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header with Back Button */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowLanguagePanel(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            <h2 className="text-xl font-playfair font-semibold text-gray-900 dark:text-white">
              {t('language')}
            </h2>
          </div>

          {/* Language List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-1">
              {/* Back button as first item */}
              <button
                onClick={() => setShowLanguagePanel(false)}
                className="w-full text-left px-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 flex items-center gap-3 mb-3"
              >
                <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                <span className="text-base font-medium">Back</span>
              </button>
              
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLanguagePanel(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-4 rounded-xl transition-all duration-200 flex items-center justify-between",
                    language === lang.code
                      ? "bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black shadow-md"
                      : "bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {language === lang.code && (
                      <Check className="w-5 h-5 text-black flex-shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "text-base font-medium",
                        language === lang.code ? "text-black" : "text-gray-900 dark:text-white"
                      )}>
                        {lang.nativeName}
                      </span>
                      <span className={cn(
                        "text-xs",
                        language === lang.code ? "opacity-70" : "opacity-60"
                      )}>
                        {lang.name}
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    language === lang.code ? "text-black" : "text-gray-500 dark:text-gray-400"
                  )}>
                    {lang.code.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};