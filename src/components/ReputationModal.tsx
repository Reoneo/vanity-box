import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Award, ChevronDown, Loader2, X, ExternalLink } from "lucide-react";
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
  /** When true, render body only (no Dialog wrapper) for inline embedding. */
  inline?: boolean;
}

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
  inline = false,
}: ReputationModalProps) => {
  const [selectedBadge, setSelectedBadge] = useState<UdBadgeItem | null>(null);

  const formatProfit = (n: number | null) => {
    if (n === null || Number.isNaN(n)) return "—";
    const sign = n >= 0 ? "+" : "-";
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const totalRows =
    (hasTalent ? 1 : 0) + (hasPolymarket ? 1 : 0) + udBadges.length;

  const body = (
    <div className="px-4 py-3 pb-6 space-y-4 max-w-lg mx-auto w-full">
            {/* Talent + Polymarket rows */}
            {hasTalent && (
              <button
                onClick={onOpenTalent}
                className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
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
                      <img src={talentProtocolIcon} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                </div>
              </button>
            )}

            {hasPolymarket && (
              <button
                onClick={onOpenPolymarket}
                className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
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
                      <img src={polymarketIcon} alt="" className="w-5 h-5 rounded-full border border-black/20 object-contain bg-white" />
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                </div>
              </button>
            )}

            {/* UD Badges grid */}
            {udBadgesLoading && (
              <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading badges…
              </div>
            )}

            {!udBadgesLoading && udBadges.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground/80 mb-3 px-1">
                  Unstoppable Badges
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {udBadges.map((b) => (
                    <button
                      key={b.code}
                      onClick={() => setSelectedBadge(b)}
                      className="relative flex items-center justify-center group"
                      title={b.name}
                    >
                      <div className="relative w-full aspect-square rounded-full overflow-hidden bg-black/5 dark:bg-white/5 border border-border/40 group-hover:border-[#D4AF37]/60 group-active:scale-95 transition-all">
                        {b.logo ? (
                          <img
                            src={b.logo}
                            alt={b.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const t = e.currentTarget as HTMLImageElement;
                              t.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Award className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {typeof b.count === "number" && b.count > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#3BA9FF] text-white text-xs font-semibold flex items-center justify-center border-2 border-background">
                          {b.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {totalRows === 0 && !udBadgesLoading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No reputation data available yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Badge Detail Modal */}
      <Dialog open={!!selectedBadge} onOpenChange={(v) => !v && setSelectedBadge(null)}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-[#D4AF37]/40 rounded-3xl [&>button]:hidden">
          <div className="sticky top-0 z-10 bg-background border-b border-[#D4AF37]/20 px-4 py-3 flex items-center justify-end rounded-t-3xl">
            <button
              onClick={() => setSelectedBadge(null)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
          <DialogTitle className="sr-only">{selectedBadge?.name ?? "Badge"}</DialogTitle>
          <DialogDescription className="sr-only">
            {selectedBadge?.description ?? "Badge details"}
          </DialogDescription>

          {selectedBadge && (
            <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center">
              <div className="w-40 h-40 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-border/40 flex items-center justify-center mb-6">
                {selectedBadge.logo ? (
                  <img src={selectedBadge.logo} alt={selectedBadge.name} className="w-full h-full object-cover" />
                ) : (
                  <Award className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{selectedBadge.name}</h2>
              {selectedBadge.description && (
                <p className="text-sm text-muted-foreground mb-4">{selectedBadge.description}</p>
              )}
              {typeof selectedBadge.count === "number" && selectedBadge.count > 0 && (
                <div className="text-sm text-foreground/80 mb-6">
                  <span className="font-semibold">{selectedBadge.count}</span> holders
                </div>
              )}
              <a
                href={
                  selectedBadge.linkUrl ||
                  `https://unstoppabledomains.com/badge/${encodeURIComponent(selectedBadge.code)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="w-full max-w-xs h-12 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black font-medium flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all"
              >
                Learn More
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
