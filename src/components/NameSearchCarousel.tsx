/**
 * NameSearchCarousel
 * Premium Apple/Amazon-style product bundle for Vanity ID registration
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Sparkles, Shield, Globe, Layers } from 'lucide-react';
import { useIotaSubdomainAvailability, getSubdomainPricing } from '@/hooks/useIotaSubdomainAvailability';
import { useCryptoPrices } from '@/contexts/CryptoPriceContext';
import { IotaSubdomainMintModal } from '@/components/IotaSubdomainMintModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

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
  isActive: boolean;
  description: string;
};

const bundleItems: BundleItem[] = [
  {
    id: 'iota',
    avatar: vanityIotaAvatar,
    base: 'Vanity.iota',
    isActive: true,
    description: 'Your onchain identity on the IOTA network. Serves as the primary registration anchor for your Vanity ID, with full profile support and ENS-style records.'
  },
  {
    id: 'box',
    avatar: vanityBoxAvatar,
    base: 'Vanity.box',
    isActive: true,
    description: 'The root profile of the Vanity ecosystem. Acts as your universal Web3 identity hub with DNS redirect, multi-chain linking, and cross-platform recognition.'
  },
  {
    id: 'ton',
    avatar: vanityTonAvatar,
    base: 'Vanity.ton',
    isActive: false,
    description: 'Extend your identity to the TON network. Integrated with Telegram\'s ecosystem for seamless social and financial interactions across TON-based dApps.'
  },
  {
    id: 'vet',
    avatar: vanityVetAvatar,
    base: 'Vanity.vet',
    isActive: false,
    description: 'Claim your name on VeChain. Designed for enterprise-grade identity use cases including supply chain verification and sustainability credentials.'
  },
  {
    id: 'sui',
    avatar: suiLogo,
    base: 'Vanity.sui',
    isActive: false,
    description: 'Bring your Vanity identity to Sui. Built for high-performance DeFi and gaming ecosystems with object-centric identity management.'
  },
  {
    id: 'apt',
    avatar: vanityAptAvatar,
    base: 'Vanity.apt',
    isActive: false,
    description: 'Your Vanity name on Aptos. Leverages Move-based smart contracts for secure, composable identity across the Aptos ecosystem.'
  },
  {
    id: 'hl',
    avatar: vanityHlAvatar,
    base: 'Vanity.hl',
    isActive: false,
    description: 'Establish your presence on Hyperliquid. Purpose-built for on-chain trading identity and reputation in the Hyperliquid DEX ecosystem.'
  },
];

export function NameSearchCarousel({ searchQuery }: NameSearchCarouselProps) {
  const [iotaModalOpen, setIotaModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [showIotaPrice, setShowIotaPrice] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('iota');
  const isMobile = useIsMobile();
  const { prices } = useCryptoPrices();

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

  const iotaResult = useIotaSubdomainAvailability(cleanLabel);
  const displayLabel = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
  const iotaDisplayName = `${displayLabel}.Vanity.iota`;
  const pricing = getSubdomainPricing(cleanLabel);
  const isIotaValidLength = cleanLabel.length >= 3;

  const iotaTokenPrice = pricing.earlyAccessPrice > 0
    ? (pricing.earlyAccessPrice / (prices.iota || 0.22)).toFixed(2)
    : null;

  const selectedItem = bundleItems.find(b => b.id === selectedId) || bundleItems[0];

  if (!cleanLabel || cleanLabel.length < 1) return null;

  const handleViewProfile = async () => {
    setViewLoading(true);
    await new Promise((r) => setTimeout(r, 150));
    window.location.assign(`/${iotaDisplayName}`);
  };

  return (
    <>
      <Card className="w-full mb-4 rounded-2xl shadow-xl bg-card border border-border/40 overflow-hidden">
        {/* Hero header with gradient wash */}
        <div className="bg-gradient-to-b from-[#D4AF37]/10 to-transparent px-5 pt-5 pb-3 md:px-6 md:pt-6 md:pb-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">Your Digital ID</h3>
            <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25 text-[10px] font-semibold">
              <Sparkles className="w-3 h-3 mr-1" />
              Early Access
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">One registration. Seven chains. Total coverage.</p>
        </div>

        {/* Selected item showcase */}
        <div className="px-5 md:px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex gap-4 items-start"
            >
              <div className={`
                w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 bg-background shadow-lg flex-shrink-0
                ${selectedItem.isActive ? 'border-[#D4AF37]/50' : 'border-border/40'}
              `}>
                <img src={selectedItem.avatar} alt={selectedItem.base} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm md:text-base font-bold text-foreground">
                    {displayLabel}.{selectedItem.base}
                  </p>
                  {!selectedItem.isActive && (
                    <Badge className="bg-muted text-muted-foreground text-[8px] px-1.5 py-0 border border-border/50">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {selectedItem.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="mx-5 md:mx-6 h-px bg-border/60" />

        {/* Chain selector grid */}
        <div className="px-5 md:px-6 py-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-semibold">Included in bundle</p>
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {bundleItems.map((item) => {
              const fullName = `${displayLabel}.${item.base}`;
              const isSelected = item.id === selectedId;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`
                    flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all duration-200
                    ${isSelected
                      ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/40 shadow-sm'
                      : 'bg-muted/30 border border-transparent hover:bg-muted/50 hover:border-border/30'
                    }
                    ${!item.isActive && !isSelected ? 'opacity-60' : ''}
                  `}
                >
                  <div className={`
                    w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border-2 transition-all
                    ${isSelected ? 'border-[#D4AF37]' : item.isActive ? 'border-border/40' : 'border-border/20'}
                  `}>
                    <img src={item.avatar} alt={fullName} className="w-full h-full object-cover" />
                  </div>
                  <span className={`
                    text-[9px] md:text-[10px] font-medium truncate
                    ${isSelected ? 'text-[#D4AF37]' : 'text-foreground'}
                  `}>
                    {fullName}
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Trust signals */}
        <div className="mx-5 md:mx-6 h-px bg-border/60" />
        <div className="px-5 md:px-6 py-2.5 flex items-center justify-center gap-4 md:gap-6">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span className="text-[9px] md:text-[10px]">Verified Identity</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span className="text-[9px] md:text-[10px]">Multi-Chain</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="w-3 h-3" />
            <span className="text-[9px] md:text-[10px]">One Registration</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 md:mx-6 h-px bg-border/60" />

        {/* IOTA Registration Section */}
        <div className="px-5 md:px-6 py-4">
          <div className="bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 rounded-xl p-4 border border-[#D4AF37]/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <img src={vanityIotaAvatar} alt="IOTA" className="w-8 h-8 rounded-full border border-[#D4AF37]/30" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{iotaDisplayName}</p>
                  <p className="text-[10px] text-muted-foreground">Start here – register on IOTA</p>
                </div>
              </div>

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

            {/* Price */}
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
              <p className="text-xs font-medium text-foreground mb-2">Register {displayLabel}.Vanity.iota and instantly get:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                  <span>Onchain identity on IOTA</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                  <span><strong>{displayLabel}.Vanity.box</strong> DNS redirect to your profile</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                  <span>5 additional chain IDs reserved for you</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            {iotaResult.status === 'loading' ? (
              <Button disabled className="w-full bg-[#D4AF37]/50 text-black font-semibold">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking availability…
              </Button>
            ) : iotaResult.status === 'available' && isIotaValidLength ? (
              <Button
                className="w-full bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold shadow-lg"
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
              <Button disabled className="w-full bg-[#D4AF37]/50 text-black/80 font-semibold">
                Minimum 3 Characters Required
              </Button>
            ) : (
              <Button disabled className="w-full bg-[#D4AF37]/50 text-black/80 font-semibold">
                Unavailable
              </Button>
            )}
          </div>
        </div>
      </Card>

      <IotaSubdomainMintModal
        open={iotaModalOpen}
        onOpenChange={setIotaModalOpen}
        label={cleanLabel}
      />
    </>
  );
}
