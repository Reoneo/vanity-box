/**
 * NameSearchCarousel
 * Product-gallery style multi-chain ID bundle viewer.
 * Mobile: hero image + horizontal thumbnails + details.
 * Desktop: full-width layout with vertical thumbs | large image | details panel.
 */

import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useIotaSubdomainAvailability } from '@/hooks/useIotaSubdomainAvailability';
import { IotaSubdomainMintModal } from '@/components/IotaSubdomainMintModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

import vanityBoxAvatar from '@/assets/vanity-box-avatar.png';
import vanityAptAvatar from '@/assets/vanity-apt-avatar.jpeg';
import vanityHlAvatar from '@/assets/vanity-hl-avatar.png';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';
import vanityTonAvatar from '@/assets/vanity-ton-avatar.png';
import vanityVetAvatar from '@/assets/vanity-vet-avatar.png';
import suiLogo from '@/assets/sui-logo.png';

type BundleItem = {
  id: string;
  avatar: string;
  ext: string; // e.g. "Box", "Iota"
  description: string;
  isActive: boolean;
};

const bundleItems: BundleItem[] = [
  {
    id: 'iota',
    avatar: vanityIotaAvatar,
    ext: 'Iota',
    description:
      'Vanity.iota integrates identity within the IOTA ecosystem, enabling consistent naming for wallets, decentralized applications, and digital identity infrastructure.',
    isActive: true,
  },
  {
    id: 'box',
    avatar: vanityBoxAvatar,
    ext: 'Box',
    description:
      "Vanity.box is the primary identity within the Vanity ecosystem. It acts as the root profile for a user's multi-chain Web3 identity, allowing individuals to maintain a consistent name across multiple blockchain networks and digital platforms. EVM wallet support coming soon!",
    isActive: true,
  },
  {
    id: 'ton',
    avatar: vanityTonAvatar,
    ext: 'Ton',
    description:
      'Vanity.ton enables users to extend their Vanity identity into the TON ecosystem. This ensures consistent naming across Telegram-native Web3 services and TON blockchain applications.',
    isActive: false,
  },
  {
    id: 'sui',
    avatar: suiLogo,
    ext: 'Sui',
    description:
      'Vanity.sui allows your identity to exist within the Sui ecosystem. By matching your Vanity.box name, users can maintain a unified digital presence across high-performance Web3 infrastructure.',
    isActive: false,
  },
  {
    id: 'hl',
    avatar: vanityHlAvatar,
    ext: 'Hl',
    description:
      'Vanity.hl brings your consistent identity into the HL ecosystem, reinforcing the concept of cross-chain identity continuity through the Vanity naming system.',
    isActive: false,
  },
  {
    id: 'vet',
    avatar: vanityVetAvatar,
    ext: 'Vet',
    description:
      'Vanity.vet ensures your identity is represented across the VeChain ecosystem, enabling recognizable Web3 naming for users participating in enterprise blockchain environments.',
    isActive: false,
  },
  {
    id: 'apt',
    avatar: vanityAptAvatar,
    ext: 'Apt',
    description:
      'Vanity.aptos extends your Vanity identity into the Aptos blockchain network, ensuring that your Web3 identity remains consistent across emerging blockchain ecosystems.',
    isActive: false,
  },
];

const globalDescription =
  "Vanity.box bundles multiple blockchain naming systems into a single multi-chain identity package. Instead of owning different usernames across Web3 networks, users can maintain one consistent digital identity across multiple blockchains.\n\nThis approach promotes Web3 identity consistency, easier recognition, and a unified digital presence across decentralized ecosystems.";

function getSubdomainPrice(subdomain: string): number {
  const length = subdomain.length;
  if (length === 1) return 100;
  if (length === 2) return 50;
  if (length === 3) return 25;
  if (length === 4) return 15;
  if (length === 5) return 10;
  if (length >= 6 && length <= 9) return 5;
  return 1;
}

interface NameSearchCarouselProps {
  searchQuery: string;
}

export function NameSearchCarousel({ searchQuery }: NameSearchCarouselProps) {
  const [iotaModalOpen, setIotaModalOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const isMobile = useIsMobile();
  const thumbsRef = useRef<HTMLDivElement>(null);

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

  if (!cleanLabel || cleanLabel.length < 1) return null;

  const displaySub = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
  const selected = bundleItems[selectedIdx];
  // Full name format: Guy.Vanity.Iota
  const fullName = `${displaySub}.Vanity.${selected.ext}`;
  const perChainPrice = getSubdomainPrice(cleanLabel);
  const totalBundlePrice = perChainPrice * bundleItems.length;

  /* ───────────────────── MOBILE ───────────────────── */
  if (isMobile) {
    return (
      <>
        <div className="w-full rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg">
          {/* Hero image */}
          <div className="relative w-full aspect-square bg-muted/20 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.img
                key={selected.id}
                src={selected.avatar}
                alt={fullName}
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>
            {!selected.isActive && (
              <div className="absolute top-3 right-3 bg-black/70 text-[hsl(var(--primary))] text-xs font-semibold px-3 py-1 rounded-full border border-[hsl(var(--primary))]/30">
                Coming Soon
              </div>
            )}
          </div>

          {/* Horizontal thumbnail strip */}
          <div
            ref={thumbsRef}
            className="flex items-center gap-2 px-3 py-3 overflow-x-auto border-t border-border/30"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {bundleItems.map((item, idx) => {
              const thumbName = `${displaySub}.Vanity.${item.ext}`;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative ${
                    idx === selectedIdx
                      ? 'border-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/40'
                      : 'border-border/40 opacity-60'
                  }`}
                  title={thumbName}
                >
                  <img src={item.avatar} alt={thumbName} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>

          {/* Details */}
          <div className="px-5 pb-5 pt-3 space-y-2">
            <h3 className="text-xl font-bold text-foreground">{fullName}</h3>

            {/* Price */}
            <div className="pt-1">
              <span className="text-2xl font-bold text-foreground">${totalBundlePrice}</span>
              <span className="text-sm text-muted-foreground ml-2">bundle</span>
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-border/30">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selected.description}
              </p>
            </div>

            {/* Info about instant .box + reserved */}
            <div className="pt-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">Register {displaySub}.Vanity.Iota</span> and instantly receive a matching <span className="text-foreground font-medium">{displaySub}.Vanity.Box</span> subdomain with DNS profile redirect. All other chain IDs will be reserved and available to claim after linking a native wallet.
              </p>
            </div>

            {/* Register button */}
            <Button
              className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground font-semibold shadow-md mt-3"
              onClick={() => setIotaModalOpen(true)}
              disabled={iotaResult.status === 'loading'}
            >
              {iotaResult.status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                'Register'
              )}
            </Button>
          </div>
        </div>

        <IotaSubdomainMintModal open={iotaModalOpen} onOpenChange={setIotaModalOpen} label={cleanLabel} />
      </>
    );
  }

  /* ───────────────────── DESKTOP ───────────────────── */
  return (
    <>
      <div className="w-full rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg">
        <div className="flex" style={{ minHeight: '85vh' }}>
          {/* Vertical thumbnail column */}
          <div className="flex flex-col gap-3 p-4 border-r border-border/30 w-[100px] overflow-y-auto justify-center">
            {bundleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`relative flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all ${
                  idx === selectedIdx
                    ? 'border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]/40 scale-105'
                    : 'border-border/40 opacity-50 hover:opacity-75'
                }`}
                title={`${displaySub}.Vanity.${item.ext}`}
              >
                <img src={item.avatar} alt={item.ext} className="w-full h-full object-cover" />
                {!item.isActive && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white/80">SOON</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Large main image */}
          <div className="flex items-center justify-center bg-muted/5 flex-1 max-w-[50%] border-r border-border/30 p-8">
            <AnimatePresence mode="wait">
              <motion.img
                key={selected.id}
                src={selected.avatar}
                alt={fullName}
                className="w-full max-w-[500px] aspect-square rounded-2xl object-cover shadow-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              />
            </AnimatePresence>
          </div>

          {/* Right: details panel */}
          <div className="flex-1 p-8 flex flex-col gap-4 overflow-y-auto justify-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-1">{fullName}</h2>
              {!selected.isActive && (
                <span className="inline-block text-xs font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 rounded-full px-3 py-0.5 mt-1">
                  Coming Soon
                </span>
              )}
            </div>

            {/* Price */}
            <div>
              <span className="text-4xl font-bold text-foreground">${totalBundlePrice}</span>
              <span className="text-base text-muted-foreground ml-2">bundle</span>
            </div>

            {/* Description tab */}
            <div className="pt-4 border-t border-border/30">
              <div className="flex gap-6 mb-4">
                <span className="text-sm font-semibold text-foreground border-b-2 border-[hsl(var(--primary))] pb-1 cursor-default">
                  Description
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {selected.description}
              </p>
              <p className="text-xs text-muted-foreground/60 leading-relaxed whitespace-pre-line">
                {globalDescription}
              </p>
            </div>

            {/* Instant .box + reserved info */}
            <div className="px-4 py-3 rounded-xl bg-muted/20 border border-border/30">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">Register {displaySub}.Vanity.Iota</span> and instantly receive a matching <span className="text-foreground font-medium">{displaySub}.Vanity.Box</span> subdomain with DNS profile redirect. All other chain IDs will be reserved and available to claim after linking a native wallet.
              </p>
            </div>

            {/* Register button */}
            <Button
              className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground font-semibold shadow-lg text-lg py-6 mt-2"
              onClick={() => setIotaModalOpen(true)}
              disabled={iotaResult.status === 'loading'}
            >
              {iotaResult.status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                'Register'
              )}
            </Button>
          </div>
        </div>
      </div>

      <IotaSubdomainMintModal open={iotaModalOpen} onOpenChange={setIotaModalOpen} label={cleanLabel} />
    </>
  );
}
