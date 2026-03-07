/**
 * NameSearchCarousel
 * Amazon-style product gallery for Vanity multi-chain ID bundle.
 */

import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useIotaSubdomainAvailability } from "@/hooks/useIotaSubdomainAvailability";
import { IotaSubdomainMintModal } from "@/components/IotaSubdomainMintModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

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
    description: "Vanity.box is the primary identity within the Vanity ecosystem.",
    isActive: true,
  },
  {
    id: "Vanity.ton",
    avatar: vanityTonAvatar,
    name: "Vanity.Ton",
    registry: "DNS.Ton.org",
    website: "https://dns.ton.org",
    description: "Vanity.ton extends your identity into the TON ecosystem.",
    isActive: false,
  },
  {
    id: "Vanity.sui",
    avatar: suiLogo,
    name: "Vanity.Sui",
    registry: "suins.io",
    website: "https://suins.io",
    description: "Vanity.sui connects your identity to the Sui ecosystem.",
    isActive: false,
  },
  {
    id: "Vanity.iota",
    avatar: vanityIotaAvatar,
    name: "Vanity.Iota",
    registry: "IOTANames.com",
    website: "https://iotanames.com",
    description: "Vanity.iota integrates identity into the IOTA ecosystem.",
    isActive: true,
  },
  {
    id: "Vanity.hl",
    avatar: vanityHlAvatar,
    name: "Vanity.Hl",
    registry: "hlNames.xyz",
    website: "https://hlnames.xyz",
    description: "Vanity.hl extends identity to the HL ecosystem.",
    isActive: false,
  },
  {
    id: "Vanity.vet",
    avatar: vanityVetAvatar,
    name: "Vanity.Vet",
    registry: "vet.domains",
    website: "https://vet.domains",
    description: "Vanity.vet enables naming across the VeChain ecosystem.",
    isActive: false,
  },
  {
    id: "Vanity.apt",
    avatar: vanityAptAvatar,
    name: "Vanity.Apt",
    registry: "AptosNames.com",
    website: "https://www.aptosnames.com",
    description: "Vanity.apt extends identity into the Aptos blockchain.",
    isActive: false,
  },
];

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
    if (raw.endsWith(".box")) return raw.slice(0, -4);
    if (raw.endsWith(".iota")) return raw.slice(0, -5);
    if (raw.includes(".")) return "";

    return raw;
  }, [searchQuery]);

  const iotaResult = useIotaSubdomainAvailability(cleanLabel);

  if (!cleanLabel) return null;

  const displaySub = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);

  const selected = bundleItems[selectedIdx];

  /* ⭐ FIXED DOMAIN LOGIC */
  const fullName = `${displaySub}.${selected.id}`;

  const perChainPrice = getSubdomainPrice(cleanLabel);
  const totalBundlePrice = perChainPrice * bundleItems.length;

  const handleViewProfile = () => {
    const iotaName = `${displaySub}.Vanity.iota`;
    window.location.assign(`/${iotaName}`);
  };

  return (
    <>
      <div className="w-full rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg">
        <div className="flex min-h-[480px]">
          {/* Thumbnails */}
          <div className="flex flex-col gap-2 p-3 border-r border-border/30 w-[88px] overflow-y-auto">
            {bundleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                  idx === selectedIdx ? "border-[#D4AF37]" : "border-border/40 opacity-50"
                }`}
              >
                <img src={item.avatar} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Main Image */}
          <div className="flex items-center justify-center bg-muted/10 w-[420px] border-r border-border/30">
            <AnimatePresence mode="wait">
              <motion.img
                key={selected.id}
                src={selected.avatar}
                className="w-[360px] h-[360px] rounded-2xl object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </AnimatePresence>
          </div>

          {/* Details */}
          <div className="flex-1 p-6 flex flex-col gap-3">
            <h3 className="text-2xl font-bold text-foreground">{fullName}</h3>

            <p className="text-sm text-muted-foreground">
              by <span className="text-foreground font-medium">{selected.registry}</span>
            </p>

            <div>
              <span className="text-3xl font-bold">${totalBundlePrice}</span>
              <span className="text-sm text-muted-foreground ml-2">
                ({bundleItems.length} chains × ${perChainPrice})
              </span>
            </div>

            <p className="text-sm text-muted-foreground">{selected.description}</p>

            <Button
              className="w-full bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold"
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
