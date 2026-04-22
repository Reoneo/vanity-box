import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Award, ChevronRight, Loader2 } from "lucide-react";

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto p-0 bg-background border border-[#D4AF37]/40 rounded-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-[#D4AF37]/20">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#D4AF37]">
            <Award className="w-5 h-5" />
            Reputation
          </DialogTitle>
          <DialogDescription className="sr-only">
            Reputation badges and verifications
          </DialogDescription>
        </div>

        <div className="p-4 space-y-3">
          {/* Talent Protocol */}
          {hasTalent && (
            <button
              onClick={onOpenTalent}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold">
                TP
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">Talent Protocol</div>
                <div className="text-xs text-muted-foreground truncate">
                  {talentScore !== null && `Builder ${talentScore}`}
                  {talentScore !== null && talentCreatorScore !== null && " · "}
                  {talentCreatorScore !== null && `Creator ${talentCreatorScore}`}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          )}

          {/* Polymarket */}
          {hasPolymarket && (
            <button
              onClick={onOpenPolymarket}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                PM
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">Polymarket</div>
                <div className="text-xs text-muted-foreground truncate">
                  {polymarketWinRate !== null && `${(polymarketWinRate * 100).toFixed(0)}% win`}
                  {polymarketWinRate !== null && polymarketProfit !== null && " · "}
                  {polymarketProfit !== null && `PnL ${formatProfit(polymarketProfit)}`}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          )}

          {/* UD Badges */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Unstoppable Badges
              </h3>
              {udBadges.length > 0 && (
                <span className="text-xs text-[#D4AF37] font-semibold">{udBadges.length}</span>
              )}
            </div>

            {udBadgesLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Loading badges…</span>
              </div>
            ) : udBadges.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No Unstoppable badges yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {udBadges.map((b) => (
                  <a
                    key={b.code}
                    href={b.linkUrl || `https://unstoppabledomains.com/badge/${encodeURIComponent(b.code)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${b.name}${b.description ? ` — ${b.description}` : ""}`}
                    className="group flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 bg-background hover:bg-[#D4AF37]/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#D4AF37]/10 flex items-center justify-center">
                      {b.logo ? (
                        <img
                          src={b.logo}
                          alt={b.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Award className="w-5 h-5 text-[#D4AF37]" />
                      )}
                    </div>
                    <div className="text-[10px] font-medium text-center text-foreground line-clamp-2 leading-tight">
                      {b.name}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {!hasTalent && !hasPolymarket && udBadges.length === 0 && !udBadgesLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No reputation data available yet.
            </div>
          )}

          <div className="pt-3 border-t border-border/30 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-[#D4AF37]/40 text-foreground hover:bg-[#D4AF37]/10"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
