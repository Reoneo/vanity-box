/**
 * ENS Registration Card
 * Shows availability status and action buttons for ENS names
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Check, X } from "lucide-react";
import { useEnsAvailability } from "@/hooks/useEnsAvailability";
import { EnsRegisterModal } from "@/components/EnsRegisterModal";
import { format } from "date-fns";

interface ENSRegistrationCardProps {
  searchQuery: string;
}

const ENS_AVATAR = "https://cryptologos.cc/logos/ethereum-name-service-ens-logo.png";

function normalizeEnsName(input: string) {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.endsWith(".eth") ? raw : `${raw}.eth`;
}

function getUsdTierPrice(label: string | undefined) {
  const len = (label || "").length;
  if (len === 3) return 640;
  if (len === 4) return 160;
  if (len >= 5) return 5;
  return null; // 1-2 chars not handled by your pricing list
}

export const ENSRegistrationCard = ({ searchQuery }: ENSRegistrationCardProps) => {
  const navigate = useNavigate();
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  // Use onchain availability hook
  const { status, name, label, error, expiryDate } = useEnsAvailability(searchQuery);

  // Prefer hook result; fall back to normalized input
  const displayName = useMemo(() => {
    return name && name.includes(".eth") ? name : normalizeEnsName(searchQuery);
  }, [name, searchQuery]);

  const usdPrice = useMemo(() => {
    if (status !== "available") return null;
    return getUsdTierPrice(label);
  }, [status, label]);

  // Don't render if no valid search query or still idle
  if (!searchQuery || searchQuery.length < 3 || status === "idle" || status === "invalid") {
    return null;
  }

  // Matches the "Coming Soon" soft-gold vibe
  const softGoldBtn = "w-full bg-[#F3D889] text-black hover:bg-[#EECF74] active:bg-[#E3C366] font-semibold";
  const softGoldBtnDisabled = "w-full bg-[#F3D889] text-black/60 font-semibold opacity-80";

  const onViewProfile = async () => {
    if (!displayName) return;
    setViewLoading(true);

    // Brief delay so the loading state is visible before navigation
    await new Promise((r) => setTimeout(r, 350));

    // If your route is /ens/:name instead, change this to: navigate(`/ens/${displayName}`);
    navigate(`/${displayName}`);
  };

  return (
    <>
      <Card className="w-full p-4 mb-4 bg-white border border-[#D4AF37]/60 shadow-lg rounded-2xl">
        <div className="flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-[#D4AF37]/40">
            <img src={ENS_AVATAR} alt="ENS" className="w-12 h-12 object-contain" loading="lazy" />
          </div>

          {/* Everything centered below the image */}
          <div className="w-full flex flex-col items-center gap-2">
            {/* Domain name */}
            {status === "loading" ? (
              <Skeleton className="h-7 w-40" />
            ) : (
              <h3 className="text-xl font-extrabold text-black">{displayName}</h3>
            )}

            {/* Status badge */}
            {status === "loading" ? (
              <Badge variant="secondary" className="bg-black/5 text-black/70 border border-black/10">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Checking
              </Badge>
            ) : status === "available" ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                <Check className="w-3 h-3 mr-1" />
                Available
              </Badge>
            ) : status === "taken" ? (
              <Badge className="bg-red-500/15 text-red-700 border border-red-500/25">
                <X className="w-3 h-3 mr-1" />
                Registered
              </Badge>
            ) : status === "error" ? (
              <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/25">Error</Badge>
            ) : null}

            {/* Subtext / Price / Expiry */}
            <p className="text-sm text-black/60">
              {status === "available"
                ? usdPrice
                  ? `Estimated price: $${usdPrice} / year`
                  : "Estimated price unavailable for this length"
                : status === "taken"
                  ? expiryDate
                    ? `Expires ${format(expiryDate, "MMM d, yyyy")}`
                    : "This name is already registered"
                  : status === "error"
                    ? error || "Failed to check availability"
                    : "Ethereum Name Service (.eth)"}
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-black/10 my-1" />

          {/* Bottom actions (like "Coming Soon") */}
          <div className="w-full">
            {status === "loading" ? (
              <Button disabled className={softGoldBtnDisabled}>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking…
              </Button>
            ) : status === "available" ? (
              <Button className={softGoldBtn} onClick={() => setRegisterModalOpen(true)}>
                Register
              </Button>
            ) : status === "taken" ? (
              <div className="grid grid-cols-2 gap-3">
                <Button className={softGoldBtn} onClick={onViewProfile} disabled={viewLoading}>
                  {viewLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    "View Profile"
                  )}
                </Button>

                <Button
                  className={softGoldBtn}
                  onClick={() => window.open(`https://grails.app/${displayName}`, "_blank")}
                >
                  Make Offer
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Registration Modal */}
      <EnsRegisterModal open={registerModalOpen} onOpenChange={setRegisterModalOpen} name={displayName} label={label} />
    </>
  );
};
