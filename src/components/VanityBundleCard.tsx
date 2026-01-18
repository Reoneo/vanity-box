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
  base: string; // <-- parent domain (what the subdomain sits under)
};

const bundleItems: BundleItem[] = [
  { id: "box", avatar: vanityBoxAvatar, base: "vanity.box" },
  { id: "apt", avatar: vanityAptAvatar, base: "vanity.apt" },
  { id: "hl", avatar: vanityHlAvatar, base: "vanity.hl" },
  { id: "iota", avatar: vanityIotaAvatar, base: "vanity.iota" },
  { id: "ton", avatar: tonLogoBlue, base: "vanity.ton" },
  { id: "vet", avatar: vanityVetAvatar, base: "vanity.vet" }, // keep if you want VET
];

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({ subdomain = "you", onBuyBundle }) => {
  const sub = (subdomain || "you").trim().toLowerCase();

  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl p-6 shadow-lg border border-border/50">
        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-foreground">Vanity ID Bundle</h3>
          <p className="text-sm text-muted-foreground mt-1">One identity. Multiple chains.</p>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-5 mb-6">
          {bundleItems.map((item) => {
            const fullName = `${sub}.${item.base}`; // ✅ g.vanity.box, etc.

            return (
              <div key={item.id} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-blue-200 bg-white shadow-sm">
                  <img src={item.avatar} alt={fullName} className="w-full h-full object-cover" />
                </div>

                <span className="text-sm font-medium text-foreground mt-2">{fullName}</span>
              </div>
            );
          })}
        </div>

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
