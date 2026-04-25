import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Award, Loader2, X, TrendingUp, Trophy } from "lucide-react";
import vanityBoxAvatar from "@/assets/vanity-box-default-avatar.png";

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
  identity?: string;
  avatarUrl?: string | null;
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
  identity,
  avatarUrl,
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

  const displayName = identity || "Profile";
  const totalCount =
    (hasTalent ? 1 : 0) + (hasPolymarket ? 1 : 0) + udBadges.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-[#D4AF37]/40 rounded-3xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-[#D4AF37]/20 px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D4AF37]" />
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
          Reputation badges and verifications for {displayName}
        </DialogDescription>

        {/* Hero */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-3 border-b border-border/30">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#D4AF37]/60 bg-muted">
            <img
              src={avatarUrl || vanityBoxAvatar}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = vanityBoxAvatar;
              }}
            />
          </div>
          <h3 className="text-base font-semibold text-foreground text-center break-all">
            {displayName}
          </h3>
          {totalCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {totalCount} reputation {totalCount === 1 ? "item" : "items"}
            </p>
          )}
        </div>

        {/* Cards */}
        <div className="p-4 space-y-3">
          {/* Talent Protocol */}
          {hasTalent && (
            <button
              onClick={onOpenTalent}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold flex-shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  Talent Protocol
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {talentScore !== null && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
                      Builder {talentScore}
                    </span>
                  )}
                  {talentCreatorScore !== null && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
                      Creator {talentCreatorScore}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Polymarket */}
          {hasPolymarket && (
            <button
              onClick={onOpenPolymarket}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold flex-shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  Polymarket
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {polymarketWinRate !== null && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
                      {(polymarketWinRate * 100).toFixed(0)}% win
                    </span>
                  )}
                  {polymarketProfit !== null && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        polymarketProfit >= 0
                          ? "bg-green-500/15 text-green-500"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      PnL {formatProfit(polymarketProfit)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* UD Badges */}
          {(udBadgesLoading || udBadges.length > 0) && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unstoppable Badges
                </h3>
                {udBadges.length > 0 && (
                  <span className="text-xs text-[#D4AF37] font-semibold">
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
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                      className="group flex flex-col items-center gap-1.5 p-2 rounded-2xl border border-[#D4AF37]/30 hover:border-[#D4AF37]/70 bg-background hover:bg-[#D4AF37]/5 transition-all aspect-square"
                    >
                      <div className="w-full flex-1 aspect-square rounded-xl overflow-hidden bg-[#D4AF37]/10 flex items-center justify-center">
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
                          <Award className="w-6 h-6 text-[#D4AF37]" />
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
