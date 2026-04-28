import { Award, ChevronDown, ExternalLink, Loader2, Users, X } from "lucide-react";
import { useState } from "react";

export interface UdBadgeItem {
  code: string;
  name: string;
  logo: string;
  description?: string;
  linkUrl?: string;
  count?: number | null;
  type?: string;
  holdersCount?: number | null;
  sponsor?: any;
  gallery?: any;
  marketplace?: any;
  contracts?: any;
  social?: any;
  coverPhoto?: string;
  videoUrl?: string;
  groupChatId?: string;
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
  const [selectedBadge, setSelectedBadge] = useState<UdBadgeItem | null>(null);
  const [category, setCategory] = useState<"main" | "badges">("main");

  if (!open) return null;

  const displayName = identity || "Profile";

  const formatProfit = (n: number | null) => {
    if (n === null || Number.isNaN(n)) return "—";
    const sign = n >= 0 ? "+" : "-";
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const headerTitle = category === "main" ? "Reputation" : "Unstoppable Badges";

  return (
    <div
      className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col"
      style={{ backfaceVisibility: "hidden", top: "calc(env(safe-area-inset-top, 0px) + 64px)", bottom: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Reputation for ${displayName}`}
    >
      {/* Header — mirrors NFTs overlay style */}
      <div
        className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
        style={headerImageUrl ? { backgroundImage: `url(${headerImageUrl})` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
          {category !== "main" ? (
            <button
              onClick={() => setCategory("main")}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
              aria-label="Back to reputation"
            >
              <ChevronDown className="w-4 h-4 text-black rotate-90" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm max-w-[60%]">
            <h3 className="text-lg font-bold text-black dark:text-white truncate">{headerTitle}</h3>
          </div>
          <button
            onClick={() => {
              setCategory("main");
              onClose();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
            aria-label="Close Reputation"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
        {category === "main" ? (
          <div className="space-y-2 max-w-lg mx-auto">
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
                        {talentScore !== null ? `Builder ${talentScore}` : "—"}
                        {talentCreatorScore !== null ? ` · Creator ${talentCreatorScore}` : ""}
                      </p>
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
                        {polymarketWinRate !== null ? `${polymarketWinRate}% win` : "—"}
                        {polymarketProfit !== null ? ` · PnL ${formatProfit(polymarketProfit)}` : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                </div>
              </button>
            )}

            {udBadgesLoading && udBadges.length === 0 && (
              <div className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black flex items-center justify-between">
                <span className="text-sm font-medium">Unstoppable Badges — Loading…</span>
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}

            {udBadges.length > 0 && (
              <button
                onClick={() => setCategory("badges")}
                className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
              >
                <div className="flex items-center justify-between h-full">
                  <div className="text-left flex-1 min-w-0 mr-3">
                    <h4 className="font-medium text-black text-base">Unstoppable Badges</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-black/70">
                        {udBadges.length} {udBadges.length === 1 ? "item" : "items"}
                      </p>
                      <div className="flex -space-x-2">
                        {udBadges.slice(0, 3).map((b, idx) =>
                          b.logo ? (
                            <img
                              key={idx}
                              src={b.logo}
                              alt=""
                              className="w-5 h-5 rounded-full border border-black/20 object-cover"
                            />
                          ) : (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full border border-black/20 bg-black/10 flex items-center justify-center"
                            >
                              <Award className="w-3 h-3" />
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                </div>
              </button>
            )}

            {!hasTalent && !hasPolymarket && udBadges.length === 0 && !udBadgesLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No reputation data found</p>
                <p className="text-sm mt-2">This profile has no reputation items yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {udBadges.map((badge) => (
              <button
                key={badge.code}
                type="button"
                onClick={() => setSelectedBadge(badge)}
                title={`${badge.name}${badge.description ? ` — ${badge.description}` : ""}`}
                className="text-left rounded-2xl border border-[#D4AF37]/30 bg-card hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/5 transition-all p-3"
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
                {typeof badge.holdersCount === "number" && (
                  <div className="text-[10px] text-muted-foreground text-center mt-1">
                    {badge.holdersCount.toLocaleString()} holders
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedBadge && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedBadge(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedBadge.name} details`}
        >
          <div
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-background dark:bg-black border-2 border-[#D4AF37]/60 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedBadge.coverPhoto && (
              <div
                className="w-full h-28 bg-cover bg-center rounded-t-3xl"
                style={{ backgroundImage: `url(${selectedBadge.coverPhoto})` }}
              />
            )}
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-[#D4AF37] hover:bg-[#B8860B] transition-all"
              aria-label="Close badge details"
            >
              <X className="w-4 h-4 text-black" />
            </button>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border border-[#D4AF37]/40">
                  {selectedBadge.logo ? (
                    <img src={selectedBadge.logo} alt={selectedBadge.name} className="w-full h-full object-cover" />
                  ) : (
                    <Award className="w-8 h-8 text-[#D4AF37]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-foreground break-words">{selectedBadge.name}</h3>
                  {selectedBadge.type && (
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{selectedBadge.type}</p>
                  )}
                </div>
              </div>

              {selectedBadge.description && (
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {selectedBadge.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                {typeof selectedBadge.holdersCount === "number" && (
                  <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#D4AF37]" />
                    <div>
                      <div className="text-muted-foreground">Holders</div>
                      <div className="font-semibold text-foreground">
                        {selectedBadge.holdersCount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                {typeof selectedBadge.count === "number" && (
                  <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#D4AF37]" />
                    <div>
                      <div className="text-muted-foreground">Count</div>
                      <div className="font-semibold text-foreground">
                        {selectedBadge.count.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedBadge.sponsor && (selectedBadge.sponsor.name || selectedBadge.sponsor.link) && (
                <div className="rounded-xl border border-[#D4AF37]/20 bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Sponsored by</div>
                  <div className="flex items-center gap-2">
                    {selectedBadge.sponsor.logo && (
                      <img src={selectedBadge.sponsor.logo} alt="" className="w-6 h-6 rounded" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {selectedBadge.sponsor.name || selectedBadge.sponsor.link}
                    </span>
                  </div>
                </div>
              )}

              {Array.isArray(selectedBadge.gallery) && selectedBadge.gallery.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Gallery</div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedBadge.gallery.slice(0, 6).map((g: any, i: number) => {
                      const src = typeof g === "string" ? g : g?.url || g?.src;
                      return src ? (
                        <img key={i} src={src} alt="" className="w-full aspect-square object-cover rounded-lg" />
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                {selectedBadge.linkUrl && (
                  <a
                    href={selectedBadge.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#B8860B] text-black font-semibold py-2.5 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" /> Visit
                  </a>
                )}
                <a
                  href={`https://unstoppabledomains.com/badge/${encodeURIComponent(selectedBadge.code)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 text-foreground font-medium py-2.5 transition-all"
                >
                  View on Unstoppable Domains
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
