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

const bundleItems = [
  { id: "Vanity.box", avatar: vanityBoxAvatar, label: "box" },
  { id: "apt", avatar: vanityAptAvatar, label: "apt" },
  { id: "hl", avatar: vanityHlAvatar, label: "hl" },
  { id: "iota", avatar: vanityIotaAvatar, label: "iota" },
  { id: "ton", avatar: tonLogoBlue, label: "ton" },
  { id: "vet", avatar: vanityVetAvatar, label: "vet" },
];

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({ subdomain = "You", onBuyBundle }) => {
  return (
    <div className="w-full">
      {/* Clean white card matching reference */}
      <div className="bg-card rounded-2xl p-6 shadow-lg border border-border/50">
        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-foreground">Vanity ID Bundle</h3>
          <p className="text-sm text-muted-foreground mt-1">One identity. Multiple chains.</p>
        </div>

        {/* Chain Icons Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-5 mb-6">
          {bundleItems.map((item) => (
            <div key={item.id} className="flex flex-col items-center">
              {/* Circular Avatar with light blue ring */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-blue-200 bg-white shadow-sm">
                <img src={item.avatar} alt={`${subdomain}.${item.label}`} className="w-full h-full object-cover" />
              </div>

              {/* Subdomain Label */}
              <span className="text-sm font-medium text-foreground mt-2">
                {subdomain}.{item.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button - Gold/amber gradient */}
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
