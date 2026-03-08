import React, { useState, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

// Import chain logos
import vanityBoxAvatar from "@/assets/vanity-box-avatar.png";
import vanityAptAvatar from "@/assets/vanity-apt-avatar.jpeg";
import vanityHlAvatar from "@/assets/vanity-hl-avatar.png";
import vanityIotaAvatar from "@/assets/vanity-iota-avatar.png";
import vanityTonAvatar from "@/assets/vanity-ton-avatar.png";
import vanityVetAvatar from "@/assets/vanity-vet-avatar.png";
import suiLogo from "@/assets/sui-logo.png";

interface VanityBundleCardProps {
  subdomain?: string;
  onRegister?: () => void;
}

type BundleItem = {
  id: string;
  avatar: string;
  name: string;
  registry: string;
  website: string;
  description: string;
};

const bundleItems: BundleItem[] = [
  {
    id: "box",
    avatar: vanityBoxAvatar,
    name: "Vanity.Box",
    registry: "my.box",
    website: "https://my.box",
    description:
      "Vanity.box is the primary identity within the Vanity ecosystem. It acts as the root profile for a user's multi-chain Web3 identity, allowing individuals to maintain a consistent name across multiple blockchain networks and digital platforms. EVM wallet support coming soon!",
  },
  {
    id: "ton",
    avatar: vanityTonAvatar,
    name: "Vanity.Ton",
    registry: "DNS.Ton.org",
    website: "https://dns.ton.org",
    description:
      "Vanity.ton enables users to extend their Vanity identity into the TON ecosystem. This ensures consistent naming across Telegram-native Web3 services and TON blockchain applications.",
  },
  {
    id: "sui",
    avatar: suiLogo,
    name: "Vanity.Sui",
    registry: "suins.io",
    website: "https://suins.io",
    description:
      "Vanity.sui allows your identity to exist within the Sui ecosystem. By matching your Vanity.box name, users can maintain a unified digital presence across high-performance Web3 infrastructure.",
  },
  {
    id: "iota",
    avatar: vanityIotaAvatar,
    name: "Vanity.Iota",
    registry: "IOTANames.com",
    website: "https://iotanames.com",
    description:
      "Vanity.iota integrates identity within the IOTA ecosystem, enabling consistent naming for wallets, decentralized applications, and digital identity infrastructure.",
  },
  {
    id: "hl",
    avatar: vanityHlAvatar,
    name: "Vanity.Hl",
    registry: "hlNames.xyz",
    website: "https://hlnames.xyz",
    description:
      "Vanity.hl brings your consistent identity into the HL ecosystem, reinforcing the concept of cross-chain identity continuity through the Vanity naming system.",
  },
  {
    id: "vet",
    avatar: vanityVetAvatar,
    name: "Vanity.Vet",
    registry: "vet.domains",
    website: "https://vet.domains",
    description:
      "Vanity.vet ensures your identity is represented across the VeChain ecosystem, enabling recognizable Web3 naming for users participating in enterprise blockchain environments.",
  },
  {
    id: "apt",
    avatar: vanityAptAvatar,
    name: "Vanity.Apt",
    registry: "AptosNames.com",
    website: "https://www.aptosnames.com",
    description:
      "Vanity.aptos extends your Vanity identity into the Aptos blockchain network, ensuring that your Web3 identity remains consistent across emerging blockchain ecosystems.",
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

function getBundlePrice(subdomain: string): number {
  const perChain = getSubdomainPrice(subdomain);
  return perChain * bundleItems.length;
}

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({
  subdomain = "you",
  onRegister,
}) => {
  const sub = subdomain.trim().toLowerCase();
  const displaySub = sub.charAt(0).toUpperCase() + sub.slice(1);
  const isMobile = useIsMobile();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = bundleItems[selectedIdx];

  const ext = selected.name.split(".")[1];
  const fullName = `${displaySub}.${ext}`;
  const perChainPrice = getSubdomainPrice(sub);
  const totalBundlePrice = getBundlePrice(sub);

  /* ─── Mobile: product gallery ─── */
  if (isMobile) {
    return (
      <div className="w-full">
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
          {/* Main image */}
          <div className="w-full flex items-center justify-center bg-muted/30 py-10">
            <AnimatePresence mode="wait">
              <motion.img
                key={selected.id}
                src={selected.avatar}
                alt={fullName}
                className="w-44 h-44 rounded-2xl object-cover shadow-md"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>
          </div>

          {/* Thumbnail row – swipeable */}
          <div
            ref={scrollRef}
            className="flex items-center gap-2.5 px-4 py-3 overflow-x-auto border-b border-border/30 scrollbar-none"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {bundleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                  idx === selectedIdx
                    ? "border-[hsl(var(--primary))] shadow-sm scale-105"
                    : "border-border/40 opacity-60"
                }`}
              >
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Details */}
          <div className="p-5 space-y-3">
            <h3 className="text-xl font-bold text-foreground">{fullName}</h3>
            <p className="text-sm text-muted-foreground">
              By{" "}
              <span className="text-foreground font-medium">
                {selected.registry}
              </span>
            </p>

            {/* Description */}
            <div className="pt-3 border-t border-border/30">
              <h4 className="text-sm font-semibold text-foreground mb-1.5">
                Description
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selected.description}
              </p>
            </div>

            {/* Bundle Price */}
            <div className="pt-3 border-t border-border/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Per chain ({sub.length} chars)
                </span>
                <span className="text-sm font-semibold text-foreground">
                  ${perChainPrice}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Bundle ({bundleItems.length} chains)
                </span>
                <span className="text-lg font-bold text-[#D4AF37]">
                  ${totalBundlePrice}
                </span>
              </div>
            </div>

            {/* Register */}
            <Button
              className="w-full bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold shadow-md mt-2"
              onClick={onRegister}
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Desktop: side-by-side product gallery ─── */
  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
        <div className="flex">
          {/* Left: vertical thumbnails */}
          <div className="flex flex-col gap-2 p-3 border-r border-border/30">
            {bundleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedIdx
                    ? "border-[hsl(var(--primary))] shadow-sm scale-105"
                    : "border-border/40 opacity-60 hover:opacity-80"
                }`}
              >
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Center: main image */}
          <div className="flex items-center justify-center bg-muted/30 p-10 min-w-[280px]">
            <AnimatePresence mode="wait">
              <motion.img
                key={selected.id}
                src={selected.avatar}
                alt={fullName}
                className="w-56 h-56 rounded-2xl object-cover shadow-md"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>
          </div>

          {/* Right: details */}
          <div className="flex-1 p-6 space-y-3 overflow-y-auto">
            <h3 className="text-2xl font-bold text-foreground">{fullName}</h3>
            <p className="text-sm text-muted-foreground">
              By{" "}
              <span className="text-foreground font-medium">
                {selected.registry}
              </span>
            </p>

            {/* Description tab */}
            <div className="pt-4 border-t border-border/30">
              <div className="flex gap-4 mb-3">
                <span className="text-sm font-semibold text-foreground border-b-2 border-[#D4AF37] pb-1">
                  Description
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selected.description}
              </p>
            </div>

            {/* Visit website */}
            <p className="text-xs text-muted-foreground/70 pt-1">
              Visit website:{" "}
              <span className="text-foreground">{selected.registry}</span>
            </p>

            {/* Global description */}
            <div className="pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {globalDescription}
              </p>
            </div>

            {/* Bundle Price */}
            <div className="pt-3 border-t border-border/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Per chain ({sub.length} chars)
                </span>
                <span className="text-sm font-semibold text-foreground">
                  ${perChainPrice}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Bundle ({bundleItems.length} chains)
                </span>
                <span className="text-lg font-bold text-[#D4AF37]">
                  ${totalBundlePrice}
                </span>
              </div>
            </div>

            {/* Register */}
            <Button
              className="w-full bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold shadow-md mt-2"
              onClick={onRegister}
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VanityBundleCard;
