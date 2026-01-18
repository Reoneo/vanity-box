import React from "react";
import { Button } from "@/components/ui/button";

// Import chain logos
import vanityBoxAvatar from "@/assets/vanity-box-avatar.png";
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

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({ subdomain = "you", onBuyBundle }) => {
  const sub = subdomain.trim().toLowerCase();

  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl p-6 shadow-lg border border-border/50">
        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-foreground">Vanity ID Bundle</h3>
          <p className="text-sm text-muted-foreground mt-1">One identity. Multiple chains.</p>
        </div>

        {/* Chain Icons Grid – 2 columns */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 mb-6">
          {bundleItems.map((item) => {
            const fullName = `${sub}.${item.base}`;

            return (
              <div key={item.id} className="flex flex-col items-center">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-blue-200 bg-white shadow-sm">
                  <img src={item.avatar} alt={fullName} className="w-full h-full object-cover" />
                </div>

                {/* Subdomain label */}
                <span className="text-xs font-medium text-foreground mt-2 text-center break-all max-w-[140px]">
                  {fullName}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Button
          onClick={onBuyBundle}
          className="w-full bg-gradient-to-r from-amber-400 via-amber-400 to-amber-300 hover:from-amber-500 hover:via-amber-400 hover:to-amber-400 text-white font-semibold py-3 h-12 rounded-xl shadow-md transition-all duration-200"
        >
          Buy Vanity ID Bundle
        </Button>
      </div>
    </div>
  );
};

export default VanityBundleCard;
