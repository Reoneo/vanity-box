import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Repeat2, Heart, ExternalLink, ChevronDown } from "lucide-react";
import { callEdge } from "@/lib/supaInvoke";
import type { FarcasterCast, FarcasterFeedResponse } from "@/types/farcaster";
import { formatDistanceToNow } from "date-fns";

interface FarcasterFeedProps {
  username?: string;
  fid?: number;
  walletAddress?: string;
}

export const FarcasterFeed = ({ username, fid, walletAddress }: FarcasterFeedProps) => {
  const [casts, setCasts] = useState<FarcasterCast[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchCasts();
  }, [username, fid]);

  const fetchCasts = async (cursor?: string) => {
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const data = await callEdge<FarcasterFeedResponse>("get-farcaster-casts", {
        username,
        fid,
        walletAddress,
        limit: 10,
        cursor,
      });

      if (cursor) {
        setCasts((prev) => [...prev, ...data.casts]);
      } else {
        setCasts(data.casts);
      }

      setNextCursor(data.next?.cursor || null);
      setHasMore(!!data.next?.cursor);
      setError(null);
    } catch (err) {
      console.error("Error fetching Farcaster casts:", err);
      setError(err instanceof Error ? err.message : "Failed to load Farcaster activity");
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchCasts(nextCursor);
    }
  };

  const formatCastText = (text: string) => {
    // Simple link detection and formatting
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4AF37] hover:underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Activity Feeds</h3>
          <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20">
            Farcaster
          </Badge>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Activity Feeds</h3>
          <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20">
            Farcaster
          </Badge>
        </div>
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 text-center">
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Activity Feeds</h3>
          <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20">
            Farcaster
          </Badge>
        </div>
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 text-center">
          <p className="text-muted-foreground">No Farcaster activity found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">Activity Feeds</h3>
        <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20">
          Farcaster
        </Badge>
      </div>

      <div className="space-y-3">
        {casts.map((cast) => (
          <Card
            key={cast.hash}
            className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300 group"
          >
            <div className="flex gap-3">
              {/* Avatar */}
              <Avatar className="h-12 w-12 border-2 border-[#D4AF37]/20">
                <AvatarImage src={cast.author.pfp_url} alt={cast.author.display_name} />
                <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37]">
                  {cast.author.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {cast.author.display_name}
                      </span>
                      {cast.channel && (
                        <Badge variant="outline" className="text-xs border-[#D4AF37]/30 text-muted-foreground">
                          /{cast.channel.id}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      @{cast.author.username} · {formatDistanceToNow(new Date(cast.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <a
                    href={`https://warpcast.com/${cast.author.username}/${cast.hash.slice(0, 10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-[#D4AF37] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Cast text */}
                <p className="text-foreground whitespace-pre-wrap mb-3 leading-relaxed">
                  {formatCastText(cast.text)}
                </p>

                {/* Embedded images */}
                {cast.embeds.length > 0 && cast.embeds.some(e => e.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={cast.embeds.find(e => e.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.url}
                      alt="Cast media"
                      className="w-full max-h-96 object-cover"
                    />
                  </div>
                )}

                {/* Engagement metrics */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors cursor-pointer">
                    <MessageCircle className="w-4 h-4" />
                    <span>{cast.replies.count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors cursor-pointer">
                    <Repeat2 className="w-4 h-4" />
                    <span>{cast.reactions.recasts_count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors cursor-pointer">
                    <Heart className="w-4 h-4" />
                    <span>{cast.reactions.likes_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Load More button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outline"
            className="border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/50 text-foreground"
          >
            {loadingMore ? (
              "Loading..."
            ) : (
              <>
                View More
                <ChevronDown className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
