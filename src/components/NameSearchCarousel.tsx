/**
 * NameSearchCarousel
 * 2-slide swipeable carousel for name search results
 * Slide 1: ENS (.eth) - uses existing ENSRegistrationCard
 * Slide 2: Basenames (.base.eth) - new BasenamesRegistrationCard
 */

import { useState, useMemo } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X } from 'lucide-react';
import { useEnsAvailability } from '@/hooks/useEnsAvailability';
import { useBasenameAvailability } from '@/hooks/useBasenameAvailability';
import { EnsRegisterModal } from '@/components/EnsRegisterModal';
import { BasenameRegisterModal } from '@/components/BasenameRegisterModal';
import { format } from 'date-fns';

interface NameSearchCarouselProps {
  searchQuery: string;
}

const ENS_AVATAR = 'https://cryptologos.cc/logos/ethereum-name-service-ens-logo.png';
const BASE_AVATAR = 'https://cdn.brandfetch.io/id6XsSOVVS/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1757929784005';

function getEnsUsdPrice(label: string | undefined) {
  const len = (label || '').length;
  if (len === 3) return 640;
  if (len === 4) return 160;
  if (len >= 5) return 5;
  return null;
}

// Shared button styles
const softGoldBtn =
  'w-full bg-[#F3D889] text-black hover:bg-[#EECF74] active:bg-[#E3C366] font-semibold ' +
  'dark:bg-[#F0D27B] dark:hover:bg-[#E7C869] dark:active:bg-[#DCBC57]';

const softGoldBtnDisabled =
  'w-full bg-[#F3D889] text-black/60 font-semibold opacity-80 dark:bg-[#F0D27B] dark:text-black/60';

export function NameSearchCarousel({ searchQuery }: NameSearchCarouselProps) {
  const [ensModalOpen, setEnsModalOpen] = useState(false);
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState<'ens' | 'base' | null>(null);

  // Extract clean label
  const cleanLabel = useMemo(() => {
    const raw = (searchQuery || '').trim().toLowerCase();
    if (raw.endsWith('.eth')) return raw.slice(0, -4);
    if (raw.endsWith('.base.eth')) return raw.slice(0, -9);
    if (raw.includes('.')) return '';
    return raw;
  }, [searchQuery]);

  // ENS availability
  const ensResult = useEnsAvailability(cleanLabel);
  const ensDisplayName = `${cleanLabel}.eth`;
  const ensUsdPrice = getEnsUsdPrice(cleanLabel);

  // Basenames availability  
  const baseResult = useBasenameAvailability(cleanLabel);
  const baseDisplayName = `${cleanLabel}.base.eth`;

  // Don't render if no valid search
  if (!cleanLabel || cleanLabel.length < 3) {
    return null;
  }

  const handleViewProfile = async (type: 'ens' | 'base') => {
    setViewLoading(type);
    await new Promise((r) => setTimeout(r, 150));
    const name = type === 'ens' ? ensDisplayName : baseDisplayName;
    window.location.assign(`/${name}`);
  };

  return (
    <>
      <Carousel 
        className="w-full mb-4"
        opts={{ 
          align: 'start',
          loop: false,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {/* Slide 1: ENS */}
          <CarouselItem className="pl-2 md:pl-4 basis-full">
            <Card
              className="
                w-full p-4 rounded-2xl shadow-lg
                bg-white border border-[#D4AF37]/60
                dark:bg-[#0b0f1a] dark:border-[#D4AF37]/25
              "
            >
              <div className="flex flex-col items-center text-center gap-3">
                {/* Avatar */}
                <div
                  className="
                    w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden
                    bg-white border border-[#D4AF37]/40
                    dark:bg-[#0f1626] dark:border-[#D4AF37]/25
                  "
                >
                  <img src={ENS_AVATAR} alt="ENS" className="w-12 h-12 object-contain" loading="lazy" />
                </div>

                {/* Content */}
                <div className="w-full flex flex-col items-center gap-2">
                  {ensResult.status === 'loading' ? (
                    <Skeleton className="h-7 w-40 dark:bg-white/10" />
                  ) : (
                    <h3 className="text-xl font-extrabold text-black dark:text-white">{ensDisplayName}</h3>
                  )}

                  {ensResult.status === 'loading' ? (
                    <Badge className="bg-black/5 text-black/70 border border-black/10 dark:bg-white/10 dark:text-white/80 dark:border-white/10">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Checking
                    </Badge>
                  ) : ensResult.status === 'available' ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 dark:text-emerald-300">
                      <Check className="w-3 h-3 mr-1" />
                      Available
                    </Badge>
                  ) : ensResult.status === 'taken' ? (
                    <Badge className="bg-red-500/15 text-red-700 border border-red-500/25 dark:text-red-300">
                      <X className="w-3 h-3 mr-1" />
                      Registered
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-300">
                      {ensResult.status === 'invalid' ? 'Invalid' : 'Error'}
                    </Badge>
                  )}

                  <p className="text-sm text-black/60 dark:text-white/65">
                    {ensResult.status === 'available'
                      ? ensUsdPrice
                        ? `~$${ensUsdPrice}/year on Ethereum`
                        : 'Ethereum mainnet'
                      : ensResult.status === 'taken'
                        ? ensResult.expiryDate
                          ? `Expires ${format(ensResult.expiryDate, 'MMM d, yyyy')}`
                          : 'Already registered'
                        : 'Ethereum Name Service'}
                  </p>
                </div>

                <div className="w-full h-px bg-black/10 my-1 dark:bg-white/10" />

                {/* Buttons */}
                <div className="w-full">
                  {ensResult.status === 'loading' ? (
                    <Button disabled className={softGoldBtnDisabled}>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking…
                    </Button>
                  ) : ensResult.status === 'available' ? (
                    <Button className={softGoldBtn} onClick={() => setEnsModalOpen(true)}>
                      Register on Ethereum
                    </Button>
                  ) : ensResult.status === 'taken' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        className={softGoldBtn} 
                        onClick={() => handleViewProfile('ens')}
                        disabled={viewLoading === 'ens'}
                      >
                        {viewLoading === 'ens' ? 'Loading…' : 'View Profile'}
                      </Button>
                      <Button
                        className={softGoldBtn}
                        onClick={() => window.open(`https://grails.app/${ensDisplayName}`, '_blank')}
                      >
                        Make Offer
                      </Button>
                    </div>
                  ) : (
                    <Button disabled className={softGoldBtnDisabled}>
                      Unavailable
                    </Button>
                  )}
                </div>

                {/* Pagination indicator */}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  <div className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20" />
                </div>
              </div>
            </Card>
          </CarouselItem>

          {/* Slide 2: Basenames */}
          <CarouselItem className="pl-2 md:pl-4 basis-full">
            <Card
              className="
                w-full p-4 rounded-2xl shadow-lg
                bg-white border border-[#0052FF]/40
                dark:bg-[#0b0f1a] dark:border-[#0052FF]/25
              "
            >
              <div className="flex flex-col items-center text-center gap-3">
                {/* Avatar */}
                <div
                  className="
                    w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden
                    bg-[#0052FF]/10 border border-[#0052FF]/30
                    dark:bg-[#0052FF]/20 dark:border-[#0052FF]/30
                  "
                >
                  <img src={BASE_AVATAR} alt="Base" className="w-14 h-14 object-cover rounded-xl" loading="lazy" />
                </div>

                {/* Content */}
                <div className="w-full flex flex-col items-center gap-2">
                  {baseResult.status === 'loading' ? (
                    <Skeleton className="h-7 w-48 dark:bg-white/10" />
                  ) : (
                    <h3 className="text-xl font-extrabold text-black dark:text-white">{baseDisplayName}</h3>
                  )}

                  {baseResult.status === 'loading' ? (
                    <Badge className="bg-black/5 text-black/70 border border-black/10 dark:bg-white/10 dark:text-white/80 dark:border-white/10">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Checking
                    </Badge>
                  ) : baseResult.status === 'available' ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 dark:text-emerald-300">
                      <Check className="w-3 h-3 mr-1" />
                      Available
                    </Badge>
                  ) : baseResult.status === 'taken' ? (
                    <Badge className="bg-red-500/15 text-red-700 border border-red-500/25 dark:text-red-300">
                      <X className="w-3 h-3 mr-1" />
                      Registered
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-300">
                      {baseResult.status === 'invalid' ? 'Invalid' : 'Error'}
                    </Badge>
                  )}

                  <p className="text-sm text-black/60 dark:text-white/65">
                    {baseResult.status === 'available'
                      ? baseResult.priceFormatted
                        ? `${baseResult.priceFormatted} ETH/year on Base`
                        : 'Base mainnet'
                      : baseResult.status === 'taken'
                        ? baseResult.expiryDate
                          ? `Expires ${format(baseResult.expiryDate, 'MMM d, yyyy')}`
                          : 'Already registered'
                        : 'Basenames on Base'}
                  </p>
                </div>

                <div className="w-full h-px bg-black/10 my-1 dark:bg-white/10" />

                {/* Buttons */}
                <div className="w-full">
                  {baseResult.status === 'loading' ? (
                    <Button disabled className={softGoldBtnDisabled}>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking…
                    </Button>
                  ) : baseResult.status === 'available' ? (
                    <Button 
                      className="w-full bg-[#0052FF] hover:bg-[#0040CC] text-white font-semibold"
                      onClick={() => setBaseModalOpen(true)}
                    >
                      Register on Base
                    </Button>
                  ) : baseResult.status === 'taken' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        className={softGoldBtn} 
                        onClick={() => handleViewProfile('base')}
                        disabled={viewLoading === 'base'}
                      >
                        {viewLoading === 'base' ? 'Loading…' : 'View Profile'}
                      </Button>
                      <Button
                        className={softGoldBtn}
                        onClick={() => window.open(`https://www.base.org/names/${cleanLabel}`, '_blank')}
                      >
                        View on Base
                      </Button>
                    </div>
                  ) : (
                    <Button disabled className={softGoldBtnDisabled}>
                      Unavailable
                    </Button>
                  )}
                </div>

                {/* Pagination indicator */}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20" />
                  <div className="w-2 h-2 rounded-full bg-[#0052FF]" />
                </div>
              </div>
            </Card>
          </CarouselItem>
        </CarouselContent>
        
        {/* Navigation arrows (visible on desktop) */}
        <CarouselPrevious className="hidden md:flex -left-12 border-[#D4AF37]/50" />
        <CarouselNext className="hidden md:flex -right-12 border-[#D4AF37]/50" />
      </Carousel>

      {/* Registration modals */}
      <EnsRegisterModal 
        open={ensModalOpen} 
        onOpenChange={setEnsModalOpen} 
        name={ensDisplayName} 
        label={cleanLabel} 
      />
      <BasenameRegisterModal 
        open={baseModalOpen} 
        onOpenChange={setBaseModalOpen} 
        name={baseDisplayName} 
        label={cleanLabel} 
      />
    </>
  );
}
