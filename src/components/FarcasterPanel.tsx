import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Repeat2, Heart, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { callEdge } from "@/lib/supaInvoke";
import type { FarcasterCast } from "@/types/farcaster";
import { formatDistanceToNow } from "date-fns";

interface FarcasterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string;
  fid?: number;
  walletAddress?: string;
}

export const FarcasterPanel = ({ open, onOpenChange, username, fid, walletAddress }: FarcasterPanelProps) => {
  const [cast, setCast] = useState<FarcasterCast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && (username || fid || walletAddress)) {
      fetchCast();
    }
  }, [open, username, fid, walletAddress]);

  const fetchCast = async () => {
    try {
      setLoading(true);

      const data = await callEdge("get-farcaster-casts", {
        username,
        fid,
        walletAddress,
        limit: 1,
      });

      setCast(data.casts?.[0] || null);
      setError(null);
    } catch (err) {
      console.error("Error fetching Farcaster cast:", err);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-background/90 border-[#D4AF37]/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#D4AF37]">📰 Farcaster Feed</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
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
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">{error}</div>
          ) : !cast ? (
            <div className="text-center py-8 text-muted-foreground">No Farcaster activity found</div>
          ) : (
            <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="flex gap-3">
                <Avatar className="h-12 w-12 border-2 border-[#D4AF37]/20">
                  <AvatarImage src={cast.author.pfp_url} alt={cast.author.display_name} />
                  <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37]">
                    {cast.author.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
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

                  <p className="text-foreground whitespace-pre-wrap mb-3 leading-relaxed">
                    {formatCastText(cast.text)}
                  </p>

                  {cast.embeds.length > 0 && (() => {
                    const imageEmbed = cast.embeds.find(e => e?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                    const videoEmbed = cast.embeds.find(e => e?.url?.match(/\.(mp4|webm|mov)$/i));
                    
                    if (imageEmbed) {
                      return (
                        <div className="mb-3 rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                          <img
                            src={imageEmbed.url}
                            alt="Cast media"
                            className="w-full max-h-[500px] object-contain bg-black/20"
                            loading="lazy"
                          />
                        </div>
                      );
                    }
                    
                    if (videoEmbed) {
                      return (
                        <div className="mb-3 rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                          <video
                            src={videoEmbed.url}
                            controls
                            className="w-full max-h-[500px] bg-black/20"
                            playsInline
                          />
                        </div>
                      );
                    }
                    
                    return null;
                  })()}

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      <span>{cast.replies.count}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Repeat2 className="w-4 h-4" />
                      <span>{cast.reactions.recasts_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4" />
                      <span>{cast.reactions.likes_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
