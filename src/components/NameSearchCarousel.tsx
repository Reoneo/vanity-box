/**
 * NameSearchCarousel
 * Amazon-style product gallery for Vanity multi-chain ID bundle.
 * Mobile: large hero image + horizontal thumbnail strip + details below.
 * Desktop: vertical thumbnails | large image | details panel on right.
 */

import { useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Sparkles } from "lucide-react";
import { useIotaSubdomainAvailability, getSubdomainPricing } from "@/hooks/useIotaSubdomainAvailability";
import { useCryptoPrices } from "@/contexts/CryptoPriceContext";
import { IotaSubdomainMintModal } from "@/components/IotaSubdomainMintModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

// Import chain logos
import vanityBoxAvatar from "@/assets/vanity-box-avatar.png";
import vanityAptAvatar from "@/assets/vanity-apt-avatar.jpeg";
import vanityHlAvatar from "@/assets/vanity-hl-avatar.png";
import vanityIotaAvatar from "@/assets/vanity-iota-avatar.png";
import vanityTonAvatar from "@/assets/vanity-ton-avatar.png";
import vanityVetAvatar from "@/assets/vanity-vet-avatar.png";
import suiLogo from "@/assets/sui-logo.png";

interface NameSearchCarouselProps {
  searchQuery: string;
}

type BundleItem = {
  id: string;
  avatar: string;
  name: string;
  registry: string;
  website: string;
  description: string;
  isActive: boolean;
};

const bundleItems: BundleItem[] = [
  {
    id: "Vanity.box",
    avatar: vanityBoxAvatar,
    name: "Vanity.Box",
    registry: "my.box",
    website: "https://my.box",
    description:
      "Vanity.box is the primary identity within the Vanity ecosystem. It acts as the root profile for a user's multi-chain Web3 identity, allowing individuals to maintain a consistent name across multiple blockchain networks and digital platforms. EVM wallet support coming soon!",
    isActive: true,
  },
  {
    id: "Vanity.ton",
    avatar: vanityTonAvatar,
    name: "Vanity.Ton",
    registry: "DNS.Ton.org",
    website: "https://dns.ton.org",
    description:
      "Vanity.ton enables users to extend their Vanity identity into the TON ecosystem. This ensures consistent naming across Telegram-native Web3 services and TON blockchain applications.",
    isActive: false,
  },
  {
    id: "Vanity.sui",
    avatar: suiLogo,
    name: "Vanity.Sui",
    registry: "suins.io",
    website: "https://suins.io",
    description:
      "Vanity.sui allows your identity to exist within the Sui ecosystem. By matching your Vanity.box name, users can maintain a unified digital presence across high-performance Web3 infrastructure.",
    isActive: false,
  },
  {
    id: "Vanity.iota",
    avatar: vanityIotaAvatar,
    name: "Vanity.Iota",
    registry: "IOTANames.com",
    website: "https://iotanames.com",
    description:
      "Vanity.iota integrates identity within the IOTA ecosystem, enabling consistent naming for wallets, decentralized applications, and digital identity infrastructure.",
    isActive: true,
  },
  {
    id: "Vanity.hl",
    avatar: vanityHlAvatar,
    name: "Vanity.Hl",
    registry: "hlNames.xyz",
    website: "https://hlnames.xyz",
    description:
      "Vanity.hl brings your consistent identity into the HL ecosystem, reinforcing the concept of cross-chain identity continuity through the Vanity naming system.",
    isActive: false,
  },
  {
    id: "Vanity.vet",
    avatar: vanityVetAvatar,
    name: "Vanity.Vet",
    registry: "vet.domains",
    website: "https://vet.domains",
    description:
      "Vanity.vet ensures your identity is represented across the VeChain ecosystem, enabling recognizable Web3 naming for users participating in enterprise blockchain environments.",
    isActive: false,
  },
  {
    id: "Vanity.apt",
    avatar: vanityAptAvatar,
    name: "Vanity.Apt",
    registry: "AptosNames.com",
    website: "https://www.aptosnames.com",
    description:
      "Vanity.aptos extends your Vanity identity into the Aptos blockchain network, ensuring that your Web3 identity remains consistent across emerging blockchain ecosystems.",
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

export function NameSearchCarousel({ searchQuery }: NameSearchCarouselProps) {
  const [iotaModalOpen, setIotaModalOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const isMobile = useIsMobile();
  const thumbsRef = useRef<HTMLDivElement>(null);

  const cleanLabel = useMemo(() => {
    const raw = (searchQuery || "").trim().toLowerCase();
    if (raw.endsWith(".eth")) return raw.slice(0, -4);
    if (raw.endsWith(".base.eth")) return raw.slice(0, -9);
    if (raw.endsWith(".vanity.iota")) return raw.slice(0, -12);
    if (raw.endsWith(".iota")) return raw.slice(0, -5);
    if (raw.endsWith(".vanity.box")) return raw.slice(0, -11);
    if (raw.endsWith(".box")) return raw.slice(0, -4);
    if (raw.includes(".")) return "";
    return raw;
  }, [searchQuery]);

  const iotaResult = useIotaSubdomainAvailability(cleanLabel);
  const isIotaValidLength = cleanLabel.length >= 3;

  if (!cleanLabel || cleanLabel.length < 1) return null;

  const displaySub = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
  const selected = bundleItems[selectedIdx];
  const ext = selected.name.split(".")[1];
  const fullName = `${displaySub}.${ext}`;
  const perChainPrice = getSubdomainPrice(cleanLabel);
  const totalBundlePrice = perChainPrice * bundleItems.length;

  const handleViewProfile = () => {
    const iotaName = `${displaySub}.Vanity.iota`;
    window.location.assign(`/${iotaName}`);
  };

  /* ───────────────────── MOBILE ───────────────────── */
  if (isMobile) {
    return (
      <>
        <div className="w-full rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg">
          {/* Hero image – tall, full width */}
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
          </div>

          {/* Horizontal thumbnail strip */}
          <div
            ref={thumbsRef}
            className="flex items-center gap-2 px-3 py-3 overflow-x-auto border-t border-border/30"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {bundleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedIdx ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/40" : "border-border/40 opacity-50"
                }`}
              >
                <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Details below thumbnails */}
          <div className="px-5 pb-5 pt-3 space-y-2">
            <h3 className="text-xl font-bold text-foreground">{fullName}</h3>
            <p className="text-sm text-muted-foreground">
              by <span className="text-foreground font-medium">{selected.registry}</span>
            </p>

            {/* Price */}
            <div className="pt-2">
              <span className="text-2xl font-bold text-foreground">${totalBundlePrice}</span>
              <span className="text-sm text-muted-foreground ml-2">
                ({bundleItems.length} chains × ${perChainPrice})
              </span>
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-border/30">
              <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
            </div>

            {/* Register button */}
            <Button
              className="w-full bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold shadow-md mt-3"
              onClick={() => setIotaModalOpen(true)}
              disabled={iotaResult.status === "loading"}
            >
              {iotaResult.status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                "Register"
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
        <div className="flex min-h-[480px]">
          {/* Vertical thumbnail column */}
          <div className="flex flex-col gap-2 p-3 border-r border-border/30 w-[88px] overflow-y-auto">
            {bundleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedIdx
                    ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/40"
                    : "border-border/40 opacity-50 hover:opacity-75"
                }`}
              >
                <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Large main image */}
          <div className="flex items-center justify-center bg-muted/10 w-[420px] min-h-full border-r border-border/30">
            <AnimatePresence mode="wait">
              <motion.img
                key={selected.id}
                src={selected.avatar}
                alt={fullName}
                className="w-[360px] h-[360px] rounded-2xl object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>
          </div>

          {/* Right: details panel */}
          <div className="flex-1 p-6 flex flex-col gap-3 overflow-y-auto">
            <h3 className="text-2xl font-bold text-foreground">{fullName}</h3>
            <p className="text-sm text-muted-foreground">
              by <span className="text-foreground font-medium">{selected.registry}</span>
            </p>

            {/* Price */}
            <div>
              <span className="text-3xl font-bold text-foreground">${totalBundlePrice}</span>
              <span className="text-sm text-muted-foreground ml-2">
                ({bundleItems.length} chains × ${perChainPrice})
              </span>
            </div>

            {/* Description tab */}
            <div className="pt-3 border-t border-border/30">
              <div className="flex gap-6 mb-3">
                <span className="text-sm font-semibold text-foreground border-b-2 border-[#D4AF37] pb-1 cursor-default">
                  Description
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{selected.description}</p>
              <p className="text-xs text-muted-foreground/60 leading-relaxed whitespace-pre-line">
                {globalDescription}
              </p>
            </div>

            {/* Visit website (text only) */}
            <p className="text-xs text-muted-foreground pt-1">
              Visit website: <span className="text-foreground font-medium">{selected.registry}</span>
            </p>

            {/* Register button */}
            <Button
              className="w-full bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold shadow-md mt-auto"
              onClick={() => setIotaModalOpen(true)}
              disabled={iotaResult.status === "loading"}
            >
              {iotaResult.status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                "Register"
              )}
            </Button>
          </div>
        </div>
      </div>

      <IotaSubdomainMintModal open={iotaModalOpen} onOpenChange={setIotaModalOpen} label={cleanLabel} />
    </>
  );
}
