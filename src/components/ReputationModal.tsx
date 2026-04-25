import { Award, Loader2, TrendingUp, Trophy, X } from "lucide-react";
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
  headerImageUrl?: string | null;
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
  headerImageUrl,
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
  if (!open) return null;

  const displayName = identity || "Profile";
  const totalCount = (hasTalent ? 1 : 0) + (hasPolymarket ? 1 : 0) + udBadges.length;

  const formatProfit = (n: number | null) => {
    if (n === null || Number.isNaN(n)) return "—";
    const sign = n >= 0 ? "+" : "-";
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <div
      className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col"
      style={{ backfaceVisibility: "hidden", top: "calc(env(safe-area-inset-top, 0px) + 64px)", bottom: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Reputation for ${displayName}`}
    >
      <div
        className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
        style={headerImageUrl ? { backgroundImage: `url(${headerImageUrl})` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
          <div className="w-9" />
          <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm max-w-[60%]">
            <h3 className="text-lg font-bold text-black dark:text-white truncate">Reputation</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
            aria-label="Close Reputation"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37]/60 bg-muted shadow-lg">
              <img
                src={avatarUrl || vanityBoxAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = vanityBoxAvatar;
                }}
              />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-foreground break-all">{displayName}</h2>
              <p className="text-sm text-muted-foreground">
                {totalCount} reputation {totalCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          {hasTalent && (
            <button
              onClick={onOpenTalent}
              className="w-full min-h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
            >
              <div className="flex items-center justify-between h-full gap-3 py-4">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <div className="w-11 h-11 rounded-xl bg-black/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-base">Talent Protocol</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {talentScore !== null && (
                        <span className="text-xs text-black/70">Builder {talentScore}</span>
                      )}
                      {talentCreatorScore !== null && (
                        <span className="text-xs text-black/70">Creator {talentCreatorScore}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-2xl leading-none">›</span>
              </div>
            </button>
          )}

          {hasPolymarket && (
            <button
              onClick={onOpenPolymarket}
              className="w-full min-h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
            >
              <div className="flex items-center justify-between h-full gap-3 py-4">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <div className="w-11 h-11 rounded-xl bg-black/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-base">Polymarket</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {polymarketWinRate !== null && (
                        <span className="text-xs text-black/70">{polymarketWinRate}% win</span>
                      )}
                      {polymarketProfit !== null && (
                        <span className="text-xs text-black/70">PnL {formatProfit(polymarketProfit)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-2xl leading-none">›</span>
              </div>
            </button>
          )}

          {(udBadgesLoading || udBadges.length > 0) && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-foreground">Unstoppable Badges</h3>
                {udBadges.length > 0 && (
                  <span className="text-xs font-semibold text-muted-foreground">{udBadges.length}</span>
                )}
              </div>

              {udBadgesLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Loading badges…</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {udBadges.map((badge) => (
                    <a
                      key={badge.code}
                      href={badge.linkUrl || `https://unstoppabledomains.com/badge/${encodeURIComponent(badge.code)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${badge.name}${badge.description ? ` — ${badge.description}` : ""}`}
                      className="rounded-2xl border border-[#D4AF37]/30 bg-card hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/5 transition-all p-3"
                    >
                      <div className="aspect-square rounded-xl bg-muted flex items-center justify-center overflow-hidden mb-2">
                        {badge.logo ? (
                          <img
                            src={badge.logo}
                            alt={badge.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Award className="w-7 h-7 text-[#D4AF37]" />
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground text-center leading-tight line-clamp-2">
                        {badge.name}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          {!hasTalent && !hasPolymarket && udBadges.length === 0 && !udBadgesLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No reputation data found</p>
              <p className="text-sm mt-2">This profile has no reputation items yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
