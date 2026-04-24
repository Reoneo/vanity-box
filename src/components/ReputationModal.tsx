import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Award, ChevronDown, Loader2, X } from "lucide-react";
import talentProtocolIcon from "@/assets/talent-protocol-icon.jpeg";
import polymarketIcon from "@/assets/polymarket-icon-blue.png";

export interface UdBadgeItem {
  code: string;
  name: string;
  logo: string;
  description?: string;
  linkUrl?: string;
  count?: number | null;
}

interface ReputationModalProps {
  open: boolean;
  onClose: () => void;
  hasTalent: boolean;
  talentScore: number | null;
  talentCreatorScore: number | null;
  hasPolymarket: boolean;
  polymarketWinRate: number | null;
  polymarketProfit: number | null;
  udBadges: UdBadgeItem[];
  udBadgesLoading: boolean;
  onOpenTalent: () => void;
  onOpenPolymarket: () => void;
}

/**
 * ReputationModal — visually mirrors the NFT collections overlay:
 *  - Gold-gradient h-16 row buttons (from-[#D4AF37] to-[#F4E4BC] text-black)
 *  - Rounded sticky header with close button
 *  - Tap a row to open the underlying detail (Talent / Polymarket / UD badge link)
 */
export const ReputationModal = ({
  open,
  onClose,
  hasTalent,
  talentScore,
  talentCreatorScore,
  hasPolymarket,
  polymarketWinRate,
  polymarketProfit,
  udBadges,
  udBadgesLoading,
  onOpenTalent,
  onOpenPolymarket,
}: ReputationModalProps) => {
  const formatProfit = (n: number | null) => {
    if (n === null || Number.isNaN(n)) return "—";
    const sign = n >= 0 ? "+" : "-";
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const totalRows =
    (hasTalent ? 1 : 0) + (hasPolymarket ? 1 : 0) + udBadges.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-[#D4AF37]/40 rounded-3xl [&>button]:hidden">
        {/* Header — mirrors NFT overlay header pill style */}
        <div className="sticky top-0 z-10 bg-background border-b border-[#D4AF37]/20 px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <div className="w-9" />
          <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
            <DialogTitle className="text-lg font-bold text-black dark:text-white">
              Reputation
            </DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
        <DialogDescription className="sr-only">
          Reputation badges and verifications.
        </DialogDescription>

        {/* Content — gold-gradient row buttons identical to NFT overlay */}
        <div className="px-4 py-3 pb-6 space-y-2 max-w-lg mx-auto w-full">
          {hasTalent && (
            <button
              onClick={onOpenTalent}
              className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
            >
              <div className="flex items-center justify-between h-full">
                <div className="text-left flex-1 min-w-0 mr-3">
                  <h4 className="font-medium text-black text-base">Talent Protocol</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-black/70">
                      {talentScore !== null ? `Builder ${talentScore}` : ""}
                      {talentScore !== null && talentCreatorScore !== null ? " · " : ""}
                      {talentCreatorScore !== null ? `Creator ${talentCreatorScore}` : ""}
                    </p>
                    <img
                      src={talentProtocolIcon}
                      alt=""
                      className="w-5 h-5 rounded-full border border-black/20 object-cover"
                    />
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
              </div>
            </button>
          )}

          {hasPolymarket && (
            <button
              onClick={onOpenPolymarket}
              className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
            >
              <div className="flex items-center justify-between h-full">
                <div className="text-left flex-1 min-w-0 mr-3">
                  <h4 className="font-medium text-black text-base">Polymarket</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-black/70">
                      {polymarketWinRate !== null ? `${(polymarketWinRate * 100).toFixed(0)}% win` : ""}
                      {polymarketWinRate !== null && polymarketProfit !== null ? " · " : ""}
                      {polymarketProfit !== null ? `PnL ${formatProfit(polymarketProfit)}` : ""}
                    </p>
                    <img
                      src={polymarketIcon}
                      alt=""
                      className="w-5 h-5 rounded-full border border-black/20 object-contain bg-white"
                    />
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
              </div>
            </button>
          )}

          {udBadgesLoading && (
            <div className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black flex items-center justify-between">
              <span className="text-sm font-medium">Unstoppable Badges — Loading…</span>
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}

          {!udBadgesLoading && udBadges.map((b) => (
            <a
              key={b.code}
              href={
                b.linkUrl ||
                `https://unstoppabledomains.com/badge/${encodeURIComponent(b.code)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              title={`${b.name}${b.description ? ` — ${b.description}` : ""}`}
              className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation flex items-center justify-between"
            >
              <div className="text-left flex-1 min-w-0 mr-3">
                <h4 className="font-medium text-black text-base truncate">{b.name}</h4>
                <div className="flex items-center gap-2">
                  {b.description && (
                    <p className="text-sm text-black/70 truncate">{b.description}</p>
                  )}
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-black/20 bg-white flex items-center justify-center flex-shrink-0">
                    {b.logo ? (
                      <img
                        src={b.logo}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Award className="w-3 h-3 text-black/60" />
                    )}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
            </a>
          ))}

          {totalRows === 0 && !udBadgesLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No reputation data available yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
