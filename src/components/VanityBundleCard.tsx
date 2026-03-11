import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles, ExternalLink } from "lucide-react";

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
  onViewUdProfile?: (domain: string) => void;
}

type BundleItem = {
  id: string;
  avatar: string;
  base: string;
  isActive: boolean;
};

const bundleItems: BundleItem[] = [
  { id: "iota", avatar: vanityIotaAvatar, base: "Vanity.iota", isActive: true },
  { id: "box", avatar: vanityBoxAvatar, base: "Vanity.box", isActive: true },
  { id: "ton", avatar: vanityTonAvatar, base: "Vanity.ton", isActive: false },
  { id: "vet", avatar: vanityVetAvatar, base: "Vanity.vet", isActive: false },
  { id: "sui", avatar: suiLogo, base: "Vanity.sui", isActive: false },
  { id: "apt", avatar: vanityAptAvatar, base: "Vanity.apt", isActive: false },
  { id: "hl", avatar: vanityHlAvatar, base: "Vanity.hl", isActive: false },
];

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({
  subdomain = "you",
  onViewUdProfile,
}) => {
  const sub = subdomain.trim().toLowerCase();
  const isMobile = useIsMobile();
  const displaySub = sub.charAt(0).toUpperCase() + sub.slice(1);

  // The .box UD domain for this subdomain
  const udBoxDomain = `${sub}.vanity.box`;

  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl p-5 md:p-6 shadow-lg border border-border/50">
        {/* Header */}
        <div className="text-center mb-4 md:mb-5">
          <div className="inline-flex items-center gap-2 mb-1">
            <h3 className="text-lg md:text-xl font-bold text-foreground">
              Vanity ID Bundle
            </h3>
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Multi-Chain
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            One identity. Multiple chains.
          </p>
        </div>

        {/* Chain Icons Grid – 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-5 md:mb-6">
          {bundleItems.map((item) => {
            const fullName = `${displaySub}.${item.base}`;
            const shouldGrey = !item.isActive;

            return (
              <div
                key={item.id}
                className={`flex flex-col items-center ${shouldGrey ? "opacity-50" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 bg-background shadow-sm ${
                    item.isActive
                      ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/30"
                      : "border-border/40"
                  }`}
                >
                  <img
                    src={item.avatar}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] md:text-xs mt-1.5 text-center break-all max-w-[120px] ${
                    item.isActive
                      ? "text-[#D4AF37] font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {fullName}
                </span>
                {!item.isActive && (
                  <span className="text-[7px] md:text-[8px] text-muted-foreground/60 mt-0.5">
                    Coming Soon
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Button
          disabled
          className="w-full bg-gradient-to-r from-amber-400 via-amber-400 to-amber-300 text-white font-semibold py-2.5 md:py-3 h-10 md:h-12 rounded-xl shadow-md opacity-90 cursor-not-allowed text-sm md:text-base"
        >
          Coming Soon
        </Button>
      </div>
    </div>
  );
};

export default VanityBundleCard;
