import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

const PLACEHOLDER_TEXTS = [
  'Claim your Name',
  'Lookup a wallet address',
  'Lookup a Web3 Domain',
];

/**
 * Home hero for the .vanity TLD landing.
 */
export const HomeFeatureShowcase: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    if (!trimmed) return;

    // Names with a TLD → profile lookup
    if (trimmed.includes('.')) {
      navigate(`/${trimmed}`);
      return;
    }

    // 20+ characters with no dot → treat as raw wallet address lookup
    if (trimmed.length >= 20) {
      navigate(`/${trimmed}`);
      return;
    }

    // No TLD short name — open Unstoppable Domains search
    window.open(`https://get.unstoppabledomains.com/vanity/?searchTerm=${encodeURIComponent(trimmed)}`, '_blank');
  };

  return (
    <section
      aria-label=".vanity hero"
      className="w-full h-full px-4 flex flex-col items-center justify-center"
    >
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-5">
        <h1
          className={cn(
            'text-center font-black tracking-tight leading-none',
            'text-5xl sm:text-6xl md:text-7xl',
            'text-foreground dark:text-[#D4AF37]'
          )}
        >
          .vanity
        </h1>

        <p
          className={cn(
            'text-center text-lg sm:text-xl md:text-2xl font-medium',
            'text-[#D4AF37]'
          )}
        >
          {t('vanity_tagline')}
        </p>

        <div className="w-full flex flex-col items-center gap-3 mt-1">
          <label htmlFor="vanity-hero-search" className="sr-only">
            {PLACEHOLDER_TEXTS[placeholderIndex]}
          </label>
          <div className="relative w-full max-w-md">
            <Input
              id="vanity-hero-search"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={PLACEHOLDER_TEXTS[placeholderIndex]}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\s+/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              className="h-12 w-full rounded-xl bg-white text-black placeholder-black/60 border-2 border-black dark:border-[#D4AF37]/40 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37] text-base text-center px-10"
            />
            {value && (
              <button
                type="button"
                onClick={() => setValue('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-black/5 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="dock-item h-12 px-10 rounded-xl bg-[#D4AF37] text-black font-semibold text-base disabled:opacity-60 flex items-center gap-2"
            style={{ width: 'auto' }}
          >
            <Search className="w-4 h-4" />
            {t('search')}
          </button>
        </div>
      </div>
    </section>
  );
};
