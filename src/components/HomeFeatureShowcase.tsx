import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/**
 * Home hero for the .vanity TLD landing.
 * Replaces the old "Coming Soon" block with a branded
 * title + tagline + search input + search button.
 *
 * Text colour: gold in dark mode, black in light mode.
 */
export const HomeFeatureShowcase: React.FC = () => {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const isDark = resolvedTheme === 'dark';
  const textColorClass = isDark ? 'text-[#D4AF37]' : 'text-black';

  const normalize = (raw: string) => {
    const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    if (!trimmed) return '';
    // Strip a leading dot if users type ".name"
    const cleaned = trimmed.startsWith('.') ? trimmed.slice(1) : trimmed;
    if (!cleaned) return '';
    // If the user already typed a TLD, respect it; otherwise default to .vanity
    return cleaned.includes('.') ? cleaned : `${cleaned}.vanity`;
  };

  const handleSubmit = () => {
    const target = normalize(value);
    if (!target) return;
    navigate(`/${target}`);
  };

  return (
    <section
      aria-label=".vanity hero"
      className="w-full px-4 pt-6 pb-10 md:pt-10 md:pb-14 flex flex-col items-center justify-start"
    >
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-5">
        <h1
          className={cn(
            'text-center font-black tracking-tight leading-none',
            'text-5xl sm:text-6xl md:text-7xl',
            textColorClass
          )}
        >
          .vanity
        </h1>

        <p
          className={cn(
            'text-center text-lg sm:text-xl md:text-2xl font-medium',
            textColorClass
          )}
        >
          {t('vanity_tagline')}
        </p>

        <div className="w-full flex flex-col items-center gap-3 mt-1">
          <label htmlFor="vanity-hero-search" className="sr-only">
            {t('vanity_search_placeholder')}
          </label>
          <Input
            id="vanity-hero-search"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={t('vanity_search_placeholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            className="h-12 w-full max-w-md rounded-xl bg-white text-black placeholder-black/60 border-2 border-black/10 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37] text-base"
          />

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="h-12 px-10 rounded-full bg-black text-[#D4AF37] hover:bg-black/90 font-semibold text-base shadow-md disabled:opacity-60"
          >
            {t('search')}
          </Button>
        </div>
      </div>
    </section>
  );
};
