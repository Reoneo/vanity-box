/**
 * NameSearchCarousel
 * Shows Vanity ID Bundle with IOTA subdomain registration (Early Access)
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, DollarSign, Sparkles, ExternalLink, Percent } from 'lucide-react';
import { useIotaSubdomainAvailability, getSubdomainPricing } from '@/hooks/useIotaSubdomainAvailability';
import { useCryptoPrices } from '@/contexts/CryptoPriceContext';
import { IotaSubdomainMintModal } from '@/components/IotaSubdomainMintModal';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

// Import chain logos
import vanityBoxAvatar from '@/assets/vanity-box-avatar.png';
import vanityAptAvatar from '@/assets/vanity-apt-avatar.jpeg';
import vanityHlAvatar from '@/assets/vanity-hl-avatar.png';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';
import vanityTonAvatar from '@/assets/vanity-ton-avatar.png';
import vanityVetAvatar from '@/assets/vanity-vet-avatar.png';
import suiLogo from '@/assets/sui-logo.png';

interface NameSearchCarouselProps {
  searchQuery: string;
}

type BundleItem = {
  id: string;
  avatar: string;
  base: string;
  isActive: boolean; // true = can mint now (Early Access)
};

const bundleItems: BundleItem[] = [
  { id: 'iota', avatar: vanityIotaAvatar, base: 'Vanity.iota', isActive: true },
  { id: 'box', avatar: vanityBoxAvatar, base: 'Vanity.box', isActive: true },
  { id: 'ton', avatar: vanityTonAvatar, base: 'Vanity.ton', isActive: false },
  { id: 'vet', avatar: vanityVetAvatar, base: 'Vanity.vet', isActive: false },
  { id: 'sui', avatar: suiLogo, base: 'Vanity.sui', isActive: false },
  { id: 'apt', avatar: vanityAptAvatar, base: 'Vanity.apt', isActive: false },
  { id: 'hl', avatar: vanityHlAvatar, base: 'Vanity.hl', isActive: false },
];

export function NameSearchCarousel({ searchQuery }: NameSearchCarouselProps) {
  const [iotaModalOpen, setIotaModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [showIotaPrice, setShowIotaPrice] = useState(false);
  const isMobile = useIsMobile();
  const { prices } = useCryptoPrices();

  // Extract clean label
  const cleanLabel = useMemo(() => {
    const raw = (searchQuery || '').trim().toLowerCase();
    if (raw.endsWith('.eth')) return raw.slice(0, -4);
    if (raw.endsWith('.base.eth')) return raw.slice(0, -9);
    if (raw.endsWith('.vanity.iota')) return raw.slice(0, -12);
    if (raw.endsWith('.iota')) return raw.slice(0, -5);
    if (raw.endsWith('.vanity.box')) return raw.slice(0, -11);
    if (raw.endsWith('.box')) return raw.slice(0, -4);
    if (raw.includes('.')) return '';
    return raw;
  }, [searchQuery]);

  // IOTA vanity.iota subdomain availability (minimum 3 characters)
  const iotaResult = useIotaSubdomainAvailability(cleanLabel);
  const iotaDisplayName = `${cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1)}.Vanity.iota`;
  const pricing = getSubdomainPricing(cleanLabel);
  const isIotaValidLength = cleanLabel.length >= 3;

  // Convert IOTA USD price to IOTA tokens using live price
  const iotaTokenPrice = pricing.earlyAccessPrice > 0 
    ? (pricing.earlyAccessPrice / (prices.iota || 0.22)).toFixed(2) 
    : null;

  // Don't render if no valid search
  if (!cleanLabel || cleanLabel.length < 1) {
    return null;
  }

  const handleViewProfile = async () => {
    setViewLoading(true);
    await new Promise((r) => setTimeout(r, 150));
    window.location.assign(`/${iotaDisplayName}`);
  };

  return (
    <>
      <Card className="w-full mb-4 p-5 md:p-6 rounded-2xl shadow-lg bg-card border border-border/50">
        {/* Header */}
        <div className="text-center mb-4 md:mb-5">
          <div className="inline-flex items-center gap-2 mb-2">
            <h3 className="text-lg md:text-xl font-bold text-foreground">Your Digital ID</h3>
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Early Access
            </Badge>
          </div>
        </div>

        {/* Chain Icons Grid – 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-5 max-w-md mx-auto">
          {bundleItems.map((item) => {
            const displayLabel = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
            const fullName = `${displayLabel}.${item.base}`;
            const shouldGrey = !item.isActive;

            return (
              <div 
                key={item.id} 
                className={`flex flex-col items-center ${shouldGrey ? 'opacity-50' : ''}`}
              >
                <div className={`
                  relative w-11 h-11 md:w-13 md:h-13 rounded-full overflow-hidden border-2 bg-background shadow-sm
                  ${item.isActive ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30' : 'border-border/40'}
                `}>
                  <img src={item.avatar} alt={fullName} className="w-full h-full object-cover" />
                </div>
                <span className={`
                  text-[9px] md:text-[10px] mt-1.5 text-center break-all max-w-[90px]
                  ${item.isActive ? 'text-[#D4AF37] font-medium' : 'text-muted-foreground'}
                `}>
                  {fullName}
                </span>
                {!item.isActive && (
                  <span className="text-[7px] md:text-[8px] text-muted-foreground/60 mt-0.5">Coming Soon</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border mb-4" />

        {/* IOTA Registration Section (Early Access) */}
        <div className="bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 rounded-xl p-4 border border-[#D4AF37]/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src={vanityIotaAvatar} alt="IOTA" className="w-8 h-8 rounded-full border border-[#D4AF37]/30" />
              <div>
                <p className="text-sm font-semibold text-foreground">{iotaDisplayName}</p>
                <p className="text-xs text-muted-foreground">IOTA Network</p>
              </div>
            </div>

            {/* Status Badge */}
            {iotaResult.status === 'loading' ? (
              <Badge className="bg-muted text-muted-foreground border border-border">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Checking
              </Badge>
            ) : iotaResult.status === 'available' && isIotaValidLength ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 dark:text-emerald-300">
                <Check className="w-3 h-3 mr-1" />
                Available
              </Badge>
            ) : iotaResult.status === 'taken' ? (
              <Badge className="bg-red-500/15 text-red-700 border border-red-500/25 dark:text-red-300">
                <X className="w-3 h-3 mr-1" />
                Registered
              </Badge>
            ) : !isIotaValidLength && cleanLabel.length > 0 ? (
              <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-300">
                Min 3 chars
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-300">
                Invalid
              </Badge>
            )}
          </div>

          {/* Price display with Early Access */}
          {iotaResult.status === 'available' && isIotaValidLength && (
            <div className="flex items-center justify-between mb-3">
              <button 
                onClick={() => setShowIotaPrice(!showIotaPrice)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showIotaPrice ? (
                  <span>{iotaTokenPrice} IOTA</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="line-through text-muted-foreground/60">${pricing.originalPrice}</span>
                    <span className="text-[#D4AF37] font-semibold">${pricing.earlyAccessPrice}</span>
                    <Badge className="ml-1 bg-[#D4AF37]/20 text-[#D4AF37] text-[9px] px-1 py-0 border border-[#D4AF37]/30">
                      50% OFF
                    </Badge>
                  </span>
                )}
              </button>
              <span className="text-xs text-muted-foreground">({cleanLabel.length} characters)</span>
            </div>
          )}

          {/* What you get */}
          <div className="bg-background/50 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-foreground mb-2">Register {cleanLabel}.Vanity.iota and instantly get:</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                <span>Onchain identity on IOTA</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                <span><strong>{cleanLabel}.Vanity.box</strong> DNS redirect to your profile</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          {iotaResult.status === 'loading' ? (
            <Button 
              disabled 
              className="w-full bg-[#D4AF37]/50 text-black font-semibold"
            >
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking availability…
            </Button>
          ) : iotaResult.status === 'available' && isIotaValidLength ? (
          <Button 
              className="w-full bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold shadow-md"
              onClick={() => setIotaModalOpen(true)}
            >
              Register
            </Button>
          ) : iotaResult.status === 'taken' ? (
            <Button 
              className="w-full bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold"
              onClick={handleViewProfile}
              disabled={viewLoading}
            >
              {viewLoading ? 'Loading…' : 'View Profile'}
            </Button>
          ) : !isIotaValidLength ? (
            <Button 
              disabled 
              className="w-full bg-[#D4AF37]/50 text-black/80 font-semibold"
            >
              Minimum 3 Characters Required
            </Button>
          ) : (
            <Button 
              disabled 
              className="w-full bg-[#D4AF37]/50 text-black/80 font-semibold"
            >
              Unavailable
            </Button>
          )}
        </div>
      </Card>

      {/* Registration modal */}
      <IotaSubdomainMintModal
        open={iotaModalOpen}
        onOpenChange={setIotaModalOpen}
        label={cleanLabel}
      />
    </>
  );
}
