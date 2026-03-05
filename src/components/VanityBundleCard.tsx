import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onBuyBundle?: () => void;
}

type BundleItem = {
  id: string;
  avatar: string;
  label: string;
  provider: string;
  providerUrl: string;
  description: string;
};

const bundleItems: BundleItem[] = [
  {
    id: "box",
    avatar: vanityBoxAvatar,
    label: "Vanity.Box",
    provider: "my.box",
    providerUrl: "https://my.box",
    description:
      "Your Web3 domain on the .box network — a blockchain-native identity that doubles as a website URL and crypto wallet address. Own your digital presence across the decentralized web.",
  },
  {
    id: "ton",
    avatar: vanityTonAvatar,
    label: "Vanity.Ton",
    provider: "DNS.Ton.org",
    providerUrl: "https://dns.ton.org",
    description:
      "A TON DNS domain that replaces complex wallet addresses with a human-readable name on The Open Network. Send, receive, and interact seamlessly across the TON ecosystem.",
  },
  {
    id: "sui",
    avatar: suiLogo,
    label: "Vanity.Sui",
    provider: "suins.io",
    providerUrl: "https://suins.io",
    description:
      "Your on-chain identity on Sui via the Sui Name Service. Simplify transactions, define your presence, and interact confidently across the Sui DeFi ecosystem.",
  },
  {
    id: "iota",
    avatar: vanityIotaAvatar,
    label: "Vanity.Iota",
    provider: "IOTANames.com",
    providerUrl: "https://iotanames.com",
    description:
      "An IOTA Names domain that anchors your digital identity to the IOTA ledger. Link wallets, store verifiable credentials, and build a unified cross-chain profile.",
  },
  {
    id: "hl",
    avatar: vanityHlAvatar,
    label: "Vanity.Hl",
    provider: "hlNames.xyz",
    providerUrl: "https://hlnames.xyz",
    description:
      "Your digital identity in the house of finance. Hyperliquid Names connect you across the DeFi ecosystem with a seamless, recognizable on-chain name.",
  },
  {
    id: "vet",
    avatar: vanityVetAvatar,
    label: "Vanity.Vet",
    provider: "vet.domains",
    providerUrl: "https://vet.domains",
    description:
      "A .vet domain that provides a unique, unchangeable identity on VeChain. Replace complicated wallet addresses with an easy-to-remember name for everyday blockchain use.",
  },
  {
    id: "apt",
    avatar: vanityAptAvatar,
    label: "Vanity.Apt",
    provider: "AptosNames.com",
    providerUrl: "https://www.aptosnames.com",
    description:
      "Secure your .apt domain for your journey through the Aptos ecosystem. A single identity that makes on-chain interactions intuitive and consistent.",
  },
];

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({
  subdomain = "you",
}) => {
  const sub = subdomain.trim().toLowerCase();
  const displaySub = sub.charAt(0).toUpperCase() + sub.slice(1);
  const isMobile = useIsMobile();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = bundleItems[selectedIdx];

  const fullName = `${displaySub}.${selected.label.split(".")[1]}`;

  /* ─── Mobile: vertical product-page style ─── */
  if (isMobile) {
    return (
      <div className="w-full">
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
          {/* Main image */}
          <div className="w-full flex items-center justify-center bg-muted/30 py-8">
            <img
              src={selected.avatar}
              alt={fullName}
              className="w-40 h-40 rounded-2xl object-cover shadow-md"
            />
          </div>

          {/* Thumbnail row */}
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto border-b border-border/30">
            {bundleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedIdx
                    ? "border-primary shadow-sm"
                    : "border-border/40 opacity-60"
                }`}
              >
                <img
                  src={item.avatar}
                  alt={item.label}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Details */}
          <div className="p-5 space-y-3">
            <h3 className="text-xl font-bold text-foreground">
              {displaySub}.{selected.label.split(".")[1]} ID Bundle
            </h3>
            <p className="text-sm text-muted-foreground">
              by{" "}
              <a
                href={selected.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {selected.provider}
              </a>
            </p>

            {/* Description */}
            <div className="pt-2 border-t border-border/30">
              <h4 className="text-sm font-semibold text-foreground mb-1">
                Description
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selected.description}
              </p>
            </div>

            <p className="text-xs text-muted-foreground/70 italic pt-1">
              Consistent Web3 identity — one name, every chain.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Desktop: side-by-side product layout ─── */
  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
        <div className="flex">
          {/* Left: vertical thumbnails */}
          <div className="flex flex-col gap-2 p-3 border-r border-border/30 overflow-y-auto max-h-[420px]">
            {bundleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedIdx
                    ? "border-primary shadow-sm"
                    : "border-border/40 opacity-60 hover:opacity-80"
                }`}
              >
                <img
                  src={item.avatar}
                  alt={item.label}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Center: main image */}
          <div className="flex items-center justify-center bg-muted/30 p-8 min-w-[260px]">
            <img
              src={selected.avatar}
              alt={fullName}
              className="w-52 h-52 rounded-2xl object-cover shadow-md"
            />
          </div>

          {/* Right: details */}
          <div className="flex-1 p-6 space-y-3">
            <h3 className="text-2xl font-bold text-foreground">
              {displaySub}.{selected.label.split(".")[1]} ID Bundle
            </h3>
            <p className="text-sm text-muted-foreground">
              by{" "}
              <a
                href={selected.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {selected.provider}
              </a>
            </p>

            {/* Description tab area */}
            <div className="pt-4 border-t border-border/30">
              <div className="flex gap-4 mb-3">
                <span className="text-sm font-semibold text-foreground border-b-2 border-primary pb-1">
                  Description
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selected.description}
              </p>
            </div>

            <p className="text-xs text-muted-foreground/70 italic pt-2">
              Consistent Web3 identity — one name, every chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VanityBundleCard;
