import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Repeat2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { FarcasterCast } from "@/types/farcaster";
import { useFarcasterAuth } from "@/contexts/FarcasterAuthContext";
import { callEdge } from "@/lib/supaInvoke";
import { toast } from "@/hooks/use-toast";

interface FarcasterDetailModalProps {
  casts: FarcasterCast[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export const FarcasterDetailModal = ({
  casts,
  isOpen,
  onClose,
  initialIndex = 0,
}: FarcasterDetailModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedCasts, setLikedCasts] = useState<Set<string>>(new Set());
  const [recastedCasts, setRecastedCasts] = useState<Set<string>>(new Set());
  
  const { isAuthenticated, signerUuid, login, isLoading } = useFarcasterAuth();

  const currentCast = casts[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsReplying(false);
      setReplyText("");
    }
  };

  const handleNext = () => {
    if (currentIndex < casts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsReplying(false);
      setReplyText("");
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated || !signerUuid) {
      toast({ title: "Login required", description: "Please login to like casts", variant: "destructive" });
      return;
    }

    const isLiked = likedCasts.has(currentCast.hash);
    const action = isLiked ? 'remove' : 'add';

    try {
      await callEdge('react-to-farcaster-cast', {
        signerUuid,
        reactionType: 'like',
        targetHash: currentCast.hash,
        action
      });

      setLikedCasts(prev => {
        const next = new Set(prev);
        if (isLiked) {
          next.delete(currentCast.hash);
        } else {
          next.add(currentCast.hash);
        }
        return next;
      });

      toast({
        title: isLiked ? "Unliked" : "Liked",
        description: isLiked ? "Removed like from cast" : "Cast liked successfully",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to like cast", variant: "destructive" });
    }
  };

  const handleRecast = async () => {
    if (!isAuthenticated || !signerUuid) {
      toast({ title: "Login required", description: "Please login to recast", variant: "destructive" });
      return;
    }

    const isRecasted = recastedCasts.has(currentCast.hash);
    const action = isRecasted ? 'remove' : 'add';

    try {
      await callEdge('react-to-farcaster-cast', {
        signerUuid,
        reactionType: 'recast',
        targetHash: currentCast.hash,
        action
      });

      setRecastedCasts(prev => {
        const next = new Set(prev);
        if (isRecasted) {
          next.delete(currentCast.hash);
        } else {
          next.add(currentCast.hash);
        }
        return next;
      });

      toast({
        title: isRecasted ? "Unrecast" : "Recast",
        description: isRecasted ? "Removed recast" : "Cast recasted successfully",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to recast", variant: "destructive" });
    }
  };

  const handleReply = () => {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please login to reply", variant: "destructive" });
      return;
    }
    setIsReplying(true);
  };

  const handleSubmitReply = async () => {
    if (!signerUuid || !replyText.trim()) return;

    setIsSubmitting(true);
    try {
      await callEdge('publish-farcaster-cast', {
        signerUuid,
        text: replyText,
        parent: currentCast.hash
      });

      toast({
        title: "Reply posted",
        description: "Your reply has been published to Farcaster",
      });

      setReplyText("");
      setIsReplying(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to post reply", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
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
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!currentCast) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎭 Farcaster Feed
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated && (
          <Card className="p-4 bg-muted/50 border-primary/20">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Login with World ID to like, reply, and recast
              </p>
              <Button onClick={login} disabled={isLoading} size="sm">
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar>
                <AvatarImage src={currentCast.author.pfp_url} alt={currentCast.author.username} />
                <AvatarFallback>{currentCast.author.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{currentCast.author.display_name}</span>
                  <span className="text-muted-foreground text-sm">@{currentCast.author.username}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatTimestamp(currentCast.timestamp)}</span>
              </div>
            </div>

            <div className="mb-3 whitespace-pre-wrap break-words">
              {formatCastText(currentCast.text)}
            </div>

            {currentCast.embeds?.length > 0 && (
              <div className="mb-3 space-y-3">
                {currentCast.embeds.map((embed, i) => {
                  if (embed?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    return (
                      <div key={i} className="rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                        <img
                          src={embed.url}
                          alt="Embedded content"
                          className="w-full max-h-[400px] object-contain bg-black/20"
                          loading="lazy"
                        />
                      </div>
                    );
                  }
                  if (embed?.url?.match(/\.(mp4|webm|mov)$/i)) {
                    return (
                      <div key={i} className="rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                        <video
                          src={embed.url}
                          controls
                          className="w-full max-h-[400px] bg-black/20"
                          playsInline
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            <div className="flex items-center gap-6 text-muted-foreground text-sm mb-3">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {currentCast.replies.count}
              </span>
              <span className="flex items-center gap-1">
                <Repeat2 className="h-4 w-4" />
                {currentCast.reactions.recasts_count}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {currentCast.reactions.likes_count}
              </span>
            </div>

            {isAuthenticated && (
              <div className="flex gap-2">
                <Button onClick={handleReply} variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Reply
                </Button>
                <Button
                  onClick={handleLike}
                  variant={likedCasts.has(currentCast.hash) ? "default" : "outline"}
                  size="sm"
                >
                  <Heart className="h-4 w-4 mr-1" />
                  {likedCasts.has(currentCast.hash) ? "Liked" : "Like"}
                </Button>
                <Button
                  onClick={handleRecast}
                  variant={recastedCasts.has(currentCast.hash) ? "default" : "outline"}
                  size="sm"
                >
                  <Repeat2 className="h-4 w-4 mr-1" />
                  {recastedCasts.has(currentCast.hash) ? "Recasted" : "Recast"}
                </Button>
              </div>
            )}
          </Card>

          {isReplying && (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Replying to @{currentCast.author.username}
              </p>
              <Textarea
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="mb-2"
                maxLength={320}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {replyText.length}/320
                </span>
                <div className="flex gap-2">
                  <Button onClick={() => setIsReplying(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || isSubmitting}
                    size="sm"
                  >
                    {isSubmitting ? "Posting..." : "Post Reply"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-between items-center">
            <Button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {casts.length}
            </span>
            <Button
              onClick={handleNext}
              disabled={currentIndex === casts.length - 1}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
