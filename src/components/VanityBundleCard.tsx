import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Shield, Globe, Layers } from "lucide-react";

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
  base: string;
  description: string;
};

const bundleItems: BundleItem[] = [
  {
    id: "iota",
    avatar: vanityIotaAvatar,
    base: "Vanity.iota",
    description: "Your onchain identity on the IOTA network. Serves as the primary registration anchor for your Vanity ID, with full profile support and ENS-style records."
  },
  {
    id: "box",
    avatar: vanityBoxAvatar,
    base: "Vanity.box",
    description: "The root profile of the Vanity ecosystem. Acts as your universal Web3 identity hub with DNS redirect, multi-chain linking, and cross-platform recognition."
  },
  {
    id: "ton",
    avatar: vanityTonAvatar,
    base: "Vanity.ton",
    description: "Extend your identity to the TON network. Integrated with Telegram's ecosystem for seamless social and financial interactions across TON-based dApps."
  },
  {
    id: "vet",
    avatar: vanityVetAvatar,
    base: "Vanity.vet",
    description: "Claim your name on VeChain. Designed for enterprise-grade identity use cases including supply chain verification and sustainability credentials."
  },
  {
    id: "sui",
    avatar: suiLogo,
    base: "Vanity.sui",
    description: "Bring your Vanity identity to Sui. Built for high-performance DeFi and gaming ecosystems with object-centric identity management."
  },
  {
    id: "apt",
    avatar: vanityAptAvatar,
    base: "Vanity.apt",
    description: "Your Vanity name on Aptos. Leverages Move-based smart contracts for secure, composable identity across the Aptos ecosystem."
  },
  {
    id: "hl",
    avatar: vanityHlAvatar,
    base: "Vanity.hl",
    description: "Establish your presence on Hyperliquid. Purpose-built for on-chain trading identity and reputation in the Hyperliquid DEX ecosystem."
  },
];

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({ subdomain = "you" }) => {
  const sub = subdomain.trim().toLowerCase();
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string>("box");

  const selectedItem = bundleItems.find(b => b.id === selectedId) || bundleItems[1];
  const displaySub = sub.charAt(0).toUpperCase() + sub.slice(1);

  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl shadow-xl border border-border/40 overflow-hidden">
        {/* Hero header */}
        <div className="bg-gradient-to-b from-[#D4AF37]/10 to-transparent px-5 pt-5 pb-3 md:px-6 md:pt-6 md:pb-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">Vanity ID Bundle</h3>
            <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25 text-[10px] font-semibold">
              7 CHAINS
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">One identity. Every chain. Infinite reach.</p>
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
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-[#D4AF37]/40 bg-background shadow-lg flex-shrink-0">
                <img src={selectedItem.avatar} alt={selectedItem.base} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-base font-bold text-foreground">
                  {displaySub}.{selectedItem.base}
                </p>
                <p className="text-[11px] md:text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                  {selectedItem.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="mx-5 md:mx-6 h-px bg-border/60" />

        {/* Chain selector strip */}
        <div className="px-5 md:px-6 py-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-semibold">Included in bundle</p>
          <div className={`grid gap-2.5 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {bundleItems.map((item) => {
              const fullName = `${displaySub}.${item.base}`;
              const isSelected = item.id === selectedId;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                    ${isSelected
                      ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/40 shadow-sm'
                      : 'bg-muted/30 border border-transparent hover:bg-muted/60 hover:border-border/40'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 transition-all
                    ${isSelected ? 'border-[#D4AF37] shadow-md' : 'border-border/30'}
                  `}>
                    <img src={item.avatar} alt={fullName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`
                      text-[10px] md:text-[11px] font-medium block truncate
                      ${isSelected ? 'text-[#D4AF37]' : 'text-foreground'}
                    `}>
                      {fullName}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Trust signals */}
        <div className="mx-5 md:mx-6 h-px bg-border/60" />
        <div className="px-5 md:px-6 py-3 flex items-center justify-center gap-4 md:gap-6">
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

        {/* CTA */}
        <div className="px-5 md:px-6 pb-5 md:pb-6 pt-1">
          <Button
            disabled
            className="w-full bg-[#D4AF37] text-black font-semibold py-3 h-11 md:h-12 rounded-xl shadow-lg opacity-90 cursor-not-allowed text-sm md:text-base"
          >
            Coming Soon
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VanityBundleCard;
