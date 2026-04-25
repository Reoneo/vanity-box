import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Home hero for the .vanity TLD landing.
 * Brand: gold ".vanity" headline + tagline + search input that
 * redirects users to https://{name}.vanity.box so they can purchase
 * their domain on the Unstoppable Domains co-branded portal.
 */
export const HomeFeatureShowcase: React.FC = () => {
  const { t } = useLanguage();
  const [value, setValue] = useState('');

  const normalize = (raw: string) => {
    const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    if (!trimmed) return '';
    const cleaned = trimmed.startsWith('.') ? trimmed.slice(1) : trimmed;
    if (!cleaned) return '';
    // Strip any user-typed TLD: we always go to {name}.vanity.box
    const base = cleaned.split('.')[0];
    return base;
  };

  const handleSubmit = () => {
    const name = normalize(value);
    if (!name) return;
    const url = `https://${name}.vanity.box`;
    // External landing page on UD-powered vanity.box portal
    window.open(url, '_blank', 'noopener,noreferrer');
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
            'text-[#D4AF37]'
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
            className="h-12 w-full max-w-md rounded-xl bg-white text-black placeholder-black/60 border-2 border-[#D4AF37]/40 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37] text-base"
          />

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="h-12 px-10 rounded-full bg-[#D4AF37] text-black hover:bg-[#C4A030] font-semibold text-base shadow-md disabled:opacity-60 disabled:bg-[#D4AF37] disabled:text-black"
          >
            {t('search')}
          </Button>
        </div>
      </div>
    </section>
  );
};
