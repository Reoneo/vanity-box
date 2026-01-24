/**
 * ENS Registration Card
 * Shows availability status and action buttons for ENS names
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Loader2, Check, X, User, ShoppingCart } from "lucide-react";
import { useEnsAvailability } from "@/hooks/useEnsAvailability";
import { EnsRegisterModal } from "@/components/EnsRegisterModal";
import ensLogoBlue from "@/assets/ens-logo-blue.png";
import { format } from "date-fns";

interface ENSRegistrationCardProps {
  searchQuery: string;
}

export const ENSRegistrationCard = ({ searchQuery }: ENSRegistrationCardProps) => {
  const navigate = useNavigate();
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Use onchain availability hook
  const { status, name, label, error, expiryDate } = useEnsAvailability(searchQuery);

  // Don't render if no valid search query or still idle
  if (!searchQuery || searchQuery.length < 3 || status === "idle" || status === "invalid") {
    return null;
  }

  const goldBtn = "w-full bg-[#D4AF37] text-black hover:bg-[#caa533] active:bg-[#b8942e] font-semibold";
  const goldBtnSoft = "w-full bg-[#D4AF37] text-black hover:bg-[#caa533] active:bg-[#b8942e] font-semibold";

  return (
    <>
      <Card
        className="
          w-full mb-4 overflow-hidden
          bg-gradient-to-b from-[#0b0f1a] to-[#05070c]
          border border-[#D4AF37]/25
          shadow-[0_10px_30px_rgba(0,0,0,0.55)]
          rounded-2xl
        "
      >
        {/* Top content */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* ENS Logo */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5298FF] to-[#3370CC] flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={ensLogoBlue} alt="ENS" className="w-10 h-10 object-contain" />
            </div>

            {/* Name + Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {status === "loading" ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  <h3 className="text-lg font-bold text-white truncate">{name}</h3>
                )}

                {status === "loading" ? (
                  <Badge variant="secondary" className="bg-white/10 text-white/80 border border-white/10">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Checking
                  </Badge>
                ) : status === "available" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    <Check className="w-3 h-3 mr-1" />
                    Available
                  </Badge>
                ) : status === "taken" ? (
                  <Badge className="bg-red-500/15 text-red-300 border border-red-500/25">
                    <X className="w-3 h-3 mr-1" />
                    Registered
                  </Badge>
                ) : status === "error" ? (
                  <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/25">Error</Badge>
                ) : null}
              </div>

              <p className="text-sm text-white/65 mt-1">
                {status === "available"
                  ? "Register this ENS name on Ethereum"
                  : status === "taken"
                    ? expiryDate
                      ? `Expires ${format(expiryDate, "MMM d, yyyy")}`
                      : "View profile or make an offer"
                    : status === "error"
                      ? error || "Failed to check availability"
                      : "Ethereum Name Service (.eth)"}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom actions (matches "Coming Soon" style) */}
        <div className="px-5 pb-5">
          {/* subtle divider */}
          <div className="h-px w-full bg-[#D4AF37]/15 mb-4" />

          {status === "loading" ? (
            <Button disabled className={`${goldBtn} opacity-70`}>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking…
            </Button>
          ) : status === "available" ? (
            <Button className={goldBtn} onClick={() => setRegisterModalOpen(true)}>
              Register
            </Button>
          ) : status === "taken" ? (
            <div className="grid grid-cols-2 gap-3">
              <Button className={goldBtnSoft} onClick={() => navigate(`/${name}`)}>
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Button>

              <Button className={goldBtnSoft} onClick={() => window.open(`https://grails.app/${name}`, "_blank")}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Make Offer
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Registration Modal */}
      <EnsRegisterModal open={registerModalOpen} onOpenChange={setRegisterModalOpen} name={name} label={label} />
    </>
  );
};
