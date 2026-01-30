import React from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

// Import chain logos
import vanityBoxAvatar from "@/assets/vanity-box-hex-black.png";
import vanityAptAvatar from "@/assets/vanity-apt-avatar.jpeg";
import vanityHlAvatar from "@/assets/vanity-hl-avatar.png";
import vanityIotaAvatar from "@/assets/vanity-iota-avatar.png";
import tonLogoBlue from "@/assets/ton-logo-blue.png";
import vanityVetAvatar from "@/assets/vanity-vet-avatar.png";

interface VanityBundleCardProps {
  subdomain?: string;
  onBuyBundle?: () => void;
}

type BundleItem = {
  id: string;
  avatar: string;
  base: string;
};

const bundleItems: BundleItem[] = [
  { id: "box", avatar: vanityBoxAvatar, base: "vanity.box" },
  { id: "apt", avatar: vanityAptAvatar, base: "vanity.apt" },
  { id: "hl", avatar: vanityHlAvatar, base: "vanity.hl" },
  { id: "iota", avatar: vanityIotaAvatar, base: "vanity.iota" },
  { id: "ton", avatar: tonLogoBlue, base: "vanity.ton" },
  { id: "vet", avatar: vanityVetAvatar, base: "vanity.vet" },
];

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({ subdomain = "you" }) => {
  const sub = subdomain.trim().toLowerCase();
  const isMobile = useIsMobile();

  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl p-5 md:p-6 shadow-lg border border-border/50">
        {/* Header */}
        <div className="text-center mb-4 md:mb-5">
          <h3 className="text-lg md:text-xl font-bold text-foreground">Vanity ID Bundle</h3>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">One identity. Multiple chains.</p>
        </div>

        {/* Chain Icons Grid – 3 columns on desktop, 2 on mobile */}
        <div className={`grid gap-4 md:gap-6 mb-5 md:mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {bundleItems.map((item) => {
            const fullName = `${sub}.${item.base}`;

            return (
              <div key={item.id} className="flex flex-col items-center">
                {/* Avatar */}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-primary/20 bg-background shadow-sm">
                  <img src={item.avatar} alt={fullName} className="w-full h-full object-cover" />
                </div>

                {/* Subdomain label */}
                <span className="text-[10px] md:text-xs font-medium text-foreground mt-1.5 text-center break-all max-w-[120px]">
                  {fullName}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA – Coming Soon */}
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