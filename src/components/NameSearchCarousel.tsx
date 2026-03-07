/**
 * NameSearchCarousel
 * Multi-chain Vanity ID bundle display
 * Shows all bundled identities simultaneously
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useIotaSubdomainAvailability } from "@/hooks/useIotaSubdomainAvailability";
import { IotaSubdomainMintModal } from "@/components/IotaSubdomainMintModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

/* Chain logos */

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

type Chain = {
  id: string;
  ext: string;
  avatar: string;
};

const chains: Chain[] = [
  { id: "box", ext: "box", avatar: vanityBoxAvatar },
  { id: "iota", ext: "iota", avatar: vanityIotaAvatar },
  { id: "sui", ext: "sui", avatar: suiLogo },
  { id: "apt", ext: "apt", avatar: vanityAptAvatar },
  { id: "ton", ext: "ton", avatar: vanityTonAvatar },
  { id: "vet", ext: "vet", avatar: vanityVetAvatar },
  { id: "hl", ext: "hl", avatar: vanityHlAvatar },
];

/* Pricing */

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

  const isMobile = useIsMobile();

  const cleanLabel = useMemo(() => {
    const raw = (searchQuery || "").trim().toLowerCase();

    if (raw.includes(".")) return "";

    return raw;
  }, [searchQuery]);

  const iotaResult = useIotaSubdomainAvailability(cleanLabel);

  if (!cleanLabel) return null;

  const displayName = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);

  const price = getSubdomainPrice(cleanLabel);
  const totalPrice = price * chains.length;

  return (
    <>
      <div className="w-full min-h-screen flex flex-col items-center justify-center px-6">
        {/* Identity Title */}

        <motion.h1
          className="text-5xl md:text-6xl font-bold mb-10 text-center tracking-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {displayName}
        </motion.h1>

        {/* Chain Grid */}

        <div className={`grid gap-6 ${isMobile ? "grid-cols-2" : "grid-cols-4"} max-w-5xl w-full`}>
          {chains.map((chain) => (
            <motion.div
              key={chain.id}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border/30 backdrop-blur-sm hover:border-[#D4AF37] transition"
              whileHover={{ scale: 1.05 }}
            >
              <img src={chain.avatar} className="w-16 h-16 object-contain" />

              <span className="text-lg font-semibold">
                {displayName}.{chain.ext}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Price */}

        <div className="mt-12 text-center">
          <div className="text-4xl font-bold mb-6">${totalPrice}</div>

          <Button
            className="bg-[#D4AF37] hover:bg-[#C9A030] text-black font-semibold px-10 py-6 text-lg"
            onClick={() => setIotaModalOpen(true)}
            disabled={iotaResult.status === "loading"}
          >
            {iotaResult.status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "Register Bundle"
            )}
          </Button>
        </div>
      </div>

      <IotaSubdomainMintModal open={iotaModalOpen} onOpenChange={setIotaModalOpen} label={cleanLabel} />
    </>
  );
}
