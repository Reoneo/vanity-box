import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

/**
 * Home hero for the .vanity TLD landing.
 * Brand: gold ".vanity" headline + tagline + search input.
 * Search navigates to profile like the dock search bar.
 * Names without a TLD redirect to home page.
 */
export const HomeFeatureShowcase: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const trimmed = value.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    if (!trimmed) return;

    // If the query has no TLD (no dot), navigate home
    if (!trimmed.includes('.')) {
      navigate('/', { replace: false });
      return;
    }

    // Navigate to the profile route — same as dock search
    navigate(`/${encodeURIComponent(trimmed)}`, { replace: false });
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
            className="h-12 w-full max-w-md rounded-xl bg-white text-black placeholder-black/60 border-2 border-[#D4AF37]/40 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37] text-base text-center"
          />

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="h-12 px-10 rounded-full bg-[#D4AF37] text-black hover:bg-[#C4A030] font-semibold text-base shadow-md disabled:opacity-60 disabled:bg-[#D4AF37] disabled:text-black"
          >
            <Search className="w-4 h-4 mr-2" />
            {t('search')}
          </Button>
        </div>
      </div>
    </section>
  );
};
