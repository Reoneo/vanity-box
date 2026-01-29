/**
 * NameSearchCarousel
 * Three-column layout on desktop, stacked on mobile for name search results
 * Shows ENS (.eth), IOTA (.vanity.iota), and Basenames (.base.eth)
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, DollarSign } from 'lucide-react';
import { useEnsAvailability } from '@/hooks/useEnsAvailability';
import { useBasenameAvailability } from '@/hooks/useBasenameAvailability';
import { useIotaSubdomainAvailability, getSubdomainPriceUsd } from '@/hooks/useIotaSubdomainAvailability';
import { useCryptoPrices } from '@/contexts/CryptoPriceContext';
import { EnsRegisterModal } from '@/components/EnsRegisterModal';
import { BasenameRegisterModal } from '@/components/BasenameRegisterModal';
import { IotaSubdomainMintModal } from '@/components/IotaSubdomainMintModal';
import { format } from 'date-fns';
import ethLogoDark from '@/assets/eth-logo-dark.svg';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';
import { useIsMobile } from '@/hooks/use-mobile';

interface NameSearchCarouselProps {
  searchQuery: string;
}

const ENS_AVATAR = 'https://cryptologos.cc/logos/ethereum-name-service-ens-logo.png';
const BASE_AVATAR = 'https://cdn.brandfetch.io/id6XsSOVVS/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1757929784005';

// ENS pricing in USD per year based on label length
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
  const [iotaModalOpen, setIotaModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState<'ens' | 'base' | 'iota' | null>(null);
  const isMobile = useIsMobile();
  
  // Toggle for price display: USD (default) or crypto
  const [showEthPriceEns, setShowEthPriceEns] = useState(false);
  const [showEthPriceBase, setShowEthPriceBase] = useState(false);
  const [showIotaPriceIota, setShowIotaPriceIota] = useState(false);
  
  // Get crypto prices for conversion
  const { prices } = useCryptoPrices();

  // Extract clean label
  const cleanLabel = useMemo(() => {
    const raw = (searchQuery || '').trim().toLowerCase();
    if (raw.endsWith('.eth')) return raw.slice(0, -4);
    if (raw.endsWith('.base.eth')) return raw.slice(0, -9);
    if (raw.endsWith('.vanity.iota')) return raw.slice(0, -12);
    if (raw.endsWith('.iota')) return raw.slice(0, -5);
    if (raw.includes('.')) return '';
    return raw;
  }, [searchQuery]);

  // ENS availability
  const ensResult = useEnsAvailability(cleanLabel);
  const ensDisplayName = `${cleanLabel}.eth`;
  const ensUsdPrice = getEnsUsdPrice(cleanLabel);
  
  // Convert ENS USD price to ETH
  const ensEthPrice = ensUsdPrice && prices.eth > 0 
    ? (ensUsdPrice / prices.eth).toFixed(6) 
    : null;

  // Basenames availability  
  const baseResult = useBasenameAvailability(cleanLabel);
  const baseDisplayName = `${cleanLabel}.base.eth`;
  
  // Convert Basenames ETH price to USD
  const baseEthPrice = baseResult.priceFormatted;
  const baseUsdPrice = baseResult.price !== null && prices.eth > 0
    ? (Number(baseResult.price) / 1e18 * prices.eth).toFixed(2)
    : null;

  // IOTA vanity.iota subdomain availability (minimum 3 characters)
  const iotaResult = useIotaSubdomainAvailability(cleanLabel);
  const iotaDisplayName = `${cleanLabel}.vanity.iota`;
  const iotaUsdPrice = getSubdomainPriceUsd(cleanLabel);
  const isIotaValidLength = cleanLabel.length >= 3;
  
  // Convert IOTA USD price to IOTA tokens (placeholder: ~$0.25 per IOTA)
  const iotaTokenPrice = iotaUsdPrice > 0 ? (iotaUsdPrice / 0.25).toFixed(2) : null;

  // Don't render if no valid search
  if (!cleanLabel || cleanLabel.length < 1) {
    return null;
  }

  const handleViewProfile = async (type: 'ens' | 'base' | 'iota') => {
    setViewLoading(type);
    await new Promise((r) => setTimeout(r, 150));
    const name = type === 'ens' ? ensDisplayName : type === 'base' ? baseDisplayName : iotaDisplayName;
    window.location.assign(`/${name}`);
  };

  // Price display component with toggle
  const PriceDisplay = ({ 
    showCrypto, 
    usdPrice, 
    cryptoPrice, 
    cryptoSymbol,
    cryptoIcon,
    onToggle,
    network 
  }: { 
    showCrypto: boolean; 
    usdPrice: string | null; 
    cryptoPrice: string | null; 
    cryptoSymbol: string;
    cryptoIcon?: string;
    onToggle: () => void;
    network: string;
  }) => {
    if (!usdPrice && !cryptoPrice) {
      return <span>{network}</span>;
    }
    
    return (
      <button 
        onClick={onToggle}
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
        title="Click to toggle currency"
      >
        {showCrypto ? (
          <>
            {cryptoIcon && <img src={cryptoIcon} alt={cryptoSymbol} className="w-3.5 h-3.5" />}
            <span>{cryptoPrice} {cryptoSymbol}/yr</span>
          </>
        ) : (
          <>
            <DollarSign className="w-3.5 h-3.5" />
            <span>{usdPrice}/yr</span>
          </>
        )}
      </button>
    );
  };

  // ENS Card Component
  const EnsCard = () => (
    <Card
      className="
        flex-1 p-4 rounded-2xl shadow-lg
        bg-card border border-[#D4AF37]/60
        dark:border-[#D4AF37]/25
      "
    >
      <div className="flex flex-col items-center text-center gap-3">
        {/* Avatar */}
        <div
          className="
            w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden
            bg-white border border-[#D4AF37]/40
            dark:bg-[#0f1626] dark:border-[#D4AF37]/25
          "
        >
          <img src={ENS_AVATAR} alt="ENS" className="w-10 h-10 object-contain" loading="lazy" />
        </div>

        {/* Content */}
        <div className="w-full flex flex-col items-center gap-1.5">
          {ensResult.status === 'loading' ? (
            <Skeleton className="h-6 w-32 dark:bg-white/10" />
          ) : (
            <h3 className="text-lg font-extrabold text-foreground">{ensDisplayName}</h3>
          )}

          {ensResult.status === 'loading' ? (
            <Badge className="bg-muted text-muted-foreground border border-border">
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

          <p className="text-xs text-muted-foreground">
            {ensResult.status === 'available' ? (
              <PriceDisplay 
                showCrypto={showEthPriceEns}
                usdPrice={ensUsdPrice?.toString() || null}
                cryptoPrice={ensEthPrice}
                cryptoSymbol="ETH"
                cryptoIcon={ethLogoDark}
                onToggle={() => setShowEthPriceEns(!showEthPriceEns)}
                network="Ethereum"
              />
            ) : ensResult.status === 'taken' ? (
              ensResult.expiryDate
                ? `Expires ${format(ensResult.expiryDate, 'MMM d, yyyy')}`
                : 'Already registered'
            ) : (
              'Ethereum Name Service'
            )}
          </p>
        </div>

        <div className="w-full h-px bg-border my-1" />

        {/* Buttons */}
        <div className="w-full">
          {ensResult.status === 'loading' ? (
            <Button disabled className={softGoldBtnDisabled} size="sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking…
            </Button>
          ) : ensResult.status === 'available' ? (
            <Button className={softGoldBtn} size="sm" onClick={() => setEnsModalOpen(true)}>
              Register
            </Button>
          ) : ensResult.status === 'taken' ? (
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className={softGoldBtn} 
                size="sm"
                onClick={() => handleViewProfile('ens')}
                disabled={viewLoading === 'ens'}
              >
                {viewLoading === 'ens' ? 'Loading…' : 'View'}
              </Button>
              <Button
                className={softGoldBtn}
                size="sm"
                onClick={() => window.open(`https://grails.app/${ensDisplayName}`, '_blank')}
              >
                Offer
              </Button>
            </div>
          ) : (
            <Button disabled className={softGoldBtnDisabled} size="sm">
              Unavailable
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  // IOTA Vanity Card Component
  const IotaVanityCard = () => (
    <Card
      className="
        flex-1 p-4 rounded-2xl shadow-lg
        bg-card border border-teal-500/40
        dark:border-teal-500/25
      "
    >
      <div className="flex flex-col items-center text-center gap-3">
        {/* Avatar */}
        <div
          className="
            w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden
            bg-teal-500/10 border border-teal-500/30
            dark:bg-teal-500/20 dark:border-teal-500/30
          "
        >
          <img src={vanityIotaAvatar} alt="IOTA" className="w-12 h-12 object-cover rounded-lg" loading="lazy" />
        </div>

        {/* Content */}
        <div className="w-full flex flex-col items-center gap-1.5">
          {iotaResult.status === 'loading' ? (
            <Skeleton className="h-6 w-40 dark:bg-white/10" />
          ) : (
            <h3 className="text-lg font-extrabold text-foreground">{iotaDisplayName}</h3>
          )}

          {iotaResult.status === 'loading' ? (
            <Badge className="bg-muted text-muted-foreground border border-border">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Checking
            </Badge>
          ) : iotaResult.status === 'available' ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 dark:text-emerald-300">
              <Check className="w-3 h-3 mr-1" />
              Available
            </Badge>
          ) : iotaResult.status === 'taken' ? (
            <Badge className="bg-red-500/15 text-red-700 border border-red-500/25 dark:text-red-300">
              <X className="w-3 h-3 mr-1" />
              Registered
            </Badge>
          ) : iotaResult.status === 'invalid' || !isIotaValidLength ? (
            <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-300">
              {!isIotaValidLength && cleanLabel.length > 0 ? 'Min 3 chars' : 'Invalid'}
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-300">
              Error
            </Badge>
          )}

          <p className="text-xs text-muted-foreground">
            {iotaResult.status === 'available' ? (
              <PriceDisplay 
                showCrypto={showIotaPriceIota}
                usdPrice={iotaUsdPrice?.toString() || null}
                cryptoPrice={iotaTokenPrice}
                cryptoSymbol="IOTA"
                onToggle={() => setShowIotaPriceIota(!showIotaPriceIota)}
                network="IOTA"
              />
            ) : iotaResult.status === 'taken' ? (
              iotaResult.expiryDate
                ? `Expires ${format(iotaResult.expiryDate, 'MMM d, yyyy')}`
                : 'Already registered'
            ) : (
              'IOTA Names'
            )}
          </p>
        </div>

        <div className="w-full h-px bg-border my-1" />

        {/* Buttons */}
        <div className="w-full">
          {iotaResult.status === 'loading' ? (
            <Button disabled className="w-full bg-teal-500/50 text-white font-semibold opacity-80" size="sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking…
            </Button>
          ) : iotaResult.status === 'available' && isIotaValidLength ? (
            <Button 
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold"
              size="sm"
              onClick={() => setIotaModalOpen(true)}
            >
              Register
            </Button>
          ) : iotaResult.status === 'taken' ? (
            <Button 
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold" 
              size="sm"
              onClick={() => handleViewProfile('iota')}
              disabled={viewLoading === 'iota'}
            >
              {viewLoading === 'iota' ? 'Loading…' : 'View Profile'}
            </Button>
          ) : !isIotaValidLength ? (
            <Button disabled className="w-full bg-teal-500/50 text-white font-semibold opacity-80" size="sm">
              Min 3 Characters
            </Button>
          ) : (
            <Button disabled className="w-full bg-teal-500/50 text-white font-semibold opacity-80" size="sm">
              Unavailable
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  // Basenames Card Component
  const BasenamesCard = () => (
    <Card
      className="
        flex-1 p-4 rounded-2xl shadow-lg
        bg-card border border-[#0052FF]/40
        dark:border-[#0052FF]/25
      "
    >
      <div className="flex flex-col items-center text-center gap-3">
        {/* Avatar */}
        <div
          className="
            w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden
            bg-[#0052FF]/10 border border-[#0052FF]/30
            dark:bg-[#0052FF]/20 dark:border-[#0052FF]/30
          "
        >
          <img src={BASE_AVATAR} alt="Base" className="w-12 h-12 object-cover rounded-lg" loading="lazy" />
        </div>

        {/* Content */}
        <div className="w-full flex flex-col items-center gap-1.5">
          {baseResult.status === 'loading' ? (
            <Skeleton className="h-6 w-40 dark:bg-white/10" />
          ) : (
            <h3 className="text-lg font-extrabold text-foreground">{baseDisplayName}</h3>
          )}

          {baseResult.status === 'loading' ? (
            <Badge className="bg-muted text-muted-foreground border border-border">
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

          <p className="text-xs text-muted-foreground">
            {baseResult.status === 'available' ? (
              <PriceDisplay 
                showCrypto={showEthPriceBase}
                usdPrice={baseUsdPrice}
                cryptoPrice={baseEthPrice}
                cryptoSymbol="ETH"
                cryptoIcon={ethLogoDark}
                onToggle={() => setShowEthPriceBase(!showEthPriceBase)}
                network="Base"
              />
            ) : baseResult.status === 'taken' ? (
              baseResult.expiryDate
                ? `Expires ${format(baseResult.expiryDate, 'MMM d, yyyy')}`
                : 'Already registered'
            ) : (
              'Basenames on Base'
            )}
          </p>
        </div>

        <div className="w-full h-px bg-border my-1" />

        {/* Buttons */}
        <div className="w-full">
          {baseResult.status === 'loading' ? (
            <Button disabled className={softGoldBtnDisabled} size="sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking…
            </Button>
          ) : baseResult.status === 'available' ? (
            <Button 
              className="w-full bg-[#0052FF] hover:bg-[#0040CC] text-white font-semibold"
              size="sm"
              onClick={() => setBaseModalOpen(true)}
            >
              Register
            </Button>
          ) : baseResult.status === 'taken' ? (
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className={softGoldBtn} 
                size="sm"
                onClick={() => handleViewProfile('base')}
                disabled={viewLoading === 'base'}
              >
                {viewLoading === 'base' ? 'Loading…' : 'View'}
              </Button>
              <Button
                className={softGoldBtn}
                size="sm"
                onClick={() => window.open(`https://grails.app/${baseDisplayName}`, '_blank')}
              >
                Offer
              </Button>
            </div>
          ) : (
            <Button disabled className={softGoldBtnDisabled} size="sm">
              Unavailable
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <>
      {/* Desktop: 3-column grid (ENS | IOTA | Base), Mobile: stacked with IOTA first */}
      {isMobile ? (
        <div className="w-full mb-4 space-y-3">
          <IotaVanityCard />
          <EnsCard />
          <BasenamesCard />
        </div>
      ) : (
        <div className="w-full mb-4 grid grid-cols-3 gap-4">
          <EnsCard />
          <IotaVanityCard />
          <BasenamesCard />
        </div>
      )}

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
      <IotaSubdomainMintModal
        open={iotaModalOpen}
        onOpenChange={setIotaModalOpen}
        label={cleanLabel}
      />
    </>
  );
}
