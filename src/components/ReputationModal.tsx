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

  const totalCount =
    (hasTalent ? 1 : 0) + (hasPolymarket ? 1 : 0) + udBadges.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-primary/40 rounded-3xl [&>button]:hidden">
        <div className="sticky top-0 z-10 bg-background border-b border-primary/20 px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            <img src={talentProtocolIcon} alt="Reputation" className="w-6 h-6 rounded-lg object-cover" />
            <DialogTitle className="text-lg font-semibold text-foreground">
              Reputation
            </DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>
        <DialogDescription className="sr-only">
          Reputation badges and verifications.
        </DialogDescription>

        <div className="p-4 space-y-2 max-w-lg mx-auto w-full">
          {hasTalent && (
            <button
              onClick={onOpenTalent}
              className="w-full h-20 px-5 rounded-2xl bg-gradient-to-r from-primary to-primary/30 text-primary-foreground transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
            >
              <div className="flex items-center justify-between h-full gap-4">
                <div className="text-left flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-3">
                    <img src={talentProtocolIcon} alt="Talent Protocol" className="w-10 h-10 rounded-full border border-primary-foreground/20 object-cover" />
                    <div>
                      <h4 className="font-medium text-primary-foreground text-base truncate">
                        Talent Protocol
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {talentScore !== null && (
                          <span className="text-xs text-primary-foreground/80">Builder {talentScore}</span>
                        )}
                        {talentCreatorScore !== null && (
                          <span className="text-xs text-primary-foreground/80">Creator {talentCreatorScore}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-primary-foreground -rotate-90 flex-shrink-0" />
              </div>
            </button>
          )}

          {hasPolymarket && (
            <button
              onClick={onOpenPolymarket}
              className="w-full h-20 px-5 rounded-2xl bg-gradient-to-r from-primary to-primary/30 text-primary-foreground transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
            >
              <div className="flex items-center justify-between h-full gap-4">
                <div className="text-left flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-3">
                    <img src={polymarketIcon} alt="Polymarket" className="w-10 h-10 rounded-full border border-primary-foreground/20 object-contain bg-background/80" />
                    <div>
                      <h4 className="font-medium text-primary-foreground text-base truncate">
                        Polymarket
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {polymarketWinRate !== null && (
                          <span className="text-xs text-primary-foreground/80">{(polymarketWinRate * 100).toFixed(0)}% win</span>
                        )}
                        {polymarketProfit !== null && (
                          <span className="text-xs text-primary-foreground/80">PnL {formatProfit(polymarketProfit)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-primary-foreground -rotate-90 flex-shrink-0" />
              </div>
            </button>
          )}

          {(udBadgesLoading || udBadges.length > 0) && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unstoppable Badges
                </h3>
                {totalCount > 0 && (
                  <span className="text-xs text-primary font-semibold">
                    {udBadges.length}
                  </span>
                )}
              </div>

              {udBadgesLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">Loading badges…</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {udBadges.map((b) => (
                    <a
                      key={b.code}
                      href={
                        b.linkUrl ||
                        `https://unstoppabledomains.com/badge/${encodeURIComponent(b.code)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${b.name}${b.description ? ` — ${b.description}` : ""}`}
                      className="w-full h-20 px-5 rounded-2xl bg-gradient-to-r from-primary to-primary/30 text-primary-foreground transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation flex items-center justify-between gap-4"
                    >
                      <div className="text-left flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-primary-foreground/20 bg-background/80 flex items-center justify-center flex-shrink-0">
                            {b.logo ? (
                              <img
                                src={b.logo}
                                alt={b.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Award className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-primary-foreground text-base truncate">{b.name}</h4>
                            {b.description && (
                              <p className="text-xs text-primary-foreground/80 line-clamp-2">{b.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-primary-foreground -rotate-90 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasTalent && !hasPolymarket && udBadges.length === 0 && !udBadgesLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No reputation data available yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
