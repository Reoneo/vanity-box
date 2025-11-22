import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Repeat2, Heart, ExternalLink } from "lucide-react";
import { callEdge } from "@/lib/supaInvoke";
import type { FarcasterCast, FarcasterFeedResponse } from "@/types/farcaster";
import { formatDistanceToNow } from "date-fns";
import { FarcasterDetailModal } from "./FarcasterDetailModal";

interface FarcasterFeedProps {
  username?: string;
  fid?: number;
  walletAddress?: string;
}

export const FarcasterFeed = ({ username, fid, walletAddress }: FarcasterFeedProps) => {
  const [casts, setCasts] = useState<FarcasterCast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCasts();
  }, [username, fid]);

  const fetchCasts = async () => {
    try {
      setLoading(true);

      const data = await callEdge<FarcasterFeedResponse>("get-farcaster-casts", {
        username,
        fid,
        walletAddress,
        limit: 25,
      });

      setCasts(data.casts);
      setError(null);
    } catch (err) {
      console.error("Error fetching Farcaster casts:", err);
      setError(err instanceof Error ? err.message : "Failed to load Farcaster activity");
    } finally {
      setLoading(false);
    }
  };

  const formatCastText = (text: string) => {
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

  // Show only the first cast
  const displayCast = casts.length > 0 ? casts[0] : null;

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white text-center">
          Feed
        </h3>
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white text-center">
          Feed
        </h3>
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 text-center">
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (!displayCast) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white text-center">
          Feed
        </h3>
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 text-center">
          <p className="text-muted-foreground">No Farcaster activity found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white text-center">
        Feed
      </h3>

      <Card
        className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300"
      >
        <div className="flex gap-3">
          <Avatar className="h-12 w-12 border-2 border-[#D4AF37]/20">
            <AvatarImage src={displayCast.author.pfp_url} alt={displayCast.author.display_name} />
            <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37]">
              {displayCast.author.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {displayCast.author.display_name}
                  </span>
                  {displayCast.channel && (
                    <Badge variant="outline" className="text-xs border-[#D4AF37]/30 text-muted-foreground">
                      /{displayCast.channel.id}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  @{displayCast.author.username} · {formatDistanceToNow(new Date(displayCast.timestamp), { addSuffix: true })}
                </span>
              </div>
              <a
                href={`https://warpcast.com/${displayCast.author.username}/${displayCast.hash.slice(0, 10)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[#D4AF37] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <p className="text-foreground whitespace-pre-wrap mb-3 leading-relaxed">
              {formatCastText(displayCast.text)}
            </p>

            {displayCast.embeds.length > 0 && displayCast.embeds.some(e => e?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && (
              <div className="mb-3 rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                <img
                  src={displayCast.embeds.find(e => e?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.url}
                  alt="Cast media"
                  className="w-full max-h-[400px] object-contain bg-black/20"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" />
                <span>{displayCast.replies.count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Repeat2 className="w-4 h-4" />
                <span>{displayCast.reactions.recasts_count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                <span>{displayCast.reactions.likes_count}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {casts.length > 0 && (
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="outline"
          className="w-full border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/50 text-foreground"
        >
          View All Casts ({casts.length})
        </Button>
      )}

      <FarcasterDetailModal
        casts={casts}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialIndex={0}
      />
    </div>
  );
};
