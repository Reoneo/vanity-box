import { useState, useRef } from "react";
import { MessageSquare, MessageSquarePlus, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Conversation } from "@/hooks/useMessaging";
import { toast } from "sonner";

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onNewMessage?: () => void;
  domain: string;
}

export function ConversationList({ conversations, onSelect, onDelete, onNewMessage, domain }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground text-sm">No conversations yet</p>
        <p className="text-muted-foreground/60 text-xs mt-1 mb-5">
          Start a new conversation using the button below
        </p>
        {onNewMessage && (
          <button
            onClick={onNewMessage}
            className="flex items-center gap-2 px-5 py-2.5 bg-[hsl(43,76%,52%)] text-black font-semibold rounded-xl hover:bg-[hsl(43,76%,52%)]/90 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Message
          </button>
        )}
      </div>
    );
  }

  const sorted = [...conversations].sort((a, b) => {
    const aTime = a.last_message?.sent_at || a.updated_at || a.created_at;
    const bTime = b.last_message?.sent_at || b.updated_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className="flex-1 overflow-y-auto">
      {sorted.map((conv) => (
        <SwipeableConversationItem
          key={conv.conversation_id}
          conversation={conv}
          domain={domain}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface SwipeableItemProps {
  conversation: Conversation;
  domain: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

function SwipeableConversationItem({ conversation: conv, domain, onSelect, onDelete }: SwipeableItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isVerticalRef = useRef(false);
  const DELETE_THRESHOLD = -80;

  const otherMembers = conv.members.filter(
    (m) => m.domain_name?.toLowerCase() !== domain?.toLowerCase()
  );
  const displayName = otherMembers[0]?.display_name || otherMembers[0]?.domain_name || "Unknown";
  const avatarUrl = otherMembers[0]?.avatar_url;
  const timeLabel = conv.last_message?.sent_at
    ? formatTimeAgo(new Date(conv.last_message.sent_at))
    : formatTimeAgo(new Date(conv.updated_at || conv.created_at));

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = false;
    isVerticalRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // Determine scroll direction on first significant move
    if (!isDraggingRef.current && !isVerticalRef.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        isVerticalRef.current = true;
        return;
      }
      if (Math.abs(dx) > 5) {
        isDraggingRef.current = true;
      }
    }

    if (isVerticalRef.current) return;
    if (!isDraggingRef.current) return;

    // Only allow left swipe
    const clamped = Math.min(0, Math.max(-120, dx));
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    if (isVerticalRef.current) return;
    if (offsetX < DELETE_THRESHOLD) {
      // Keep open at delete position
      setOffsetX(-100);
    } else {
      setOffsetX(0);
    }
    isDraggingRef.current = false;
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(conv.conversation_id);
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden border-b border-border/20">
      {/* Delete action behind */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end w-[100px] bg-destructive">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full h-full flex flex-col items-center justify-center gap-1 text-destructive-foreground"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">{deleting ? "..." : "Delete"}</span>
        </button>
      </div>

      {/* Foreground card */}
      <div
        className="relative bg-background transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={() => { if (offsetX === 0) onSelect(conv.conversation_id); else setOffsetX(0); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
        >
          <Avatar className="w-11 h-11 flex-shrink-0 ring-2 ring-[hsl(43,76%,52%)]/20">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-[hsl(43,76%,52%)]/10 text-[hsl(43,76%,52%)] font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground truncate">
                {displayName}
              </p>
              <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                {timeLabel}
              </span>
            </div>
            {conv.last_message ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.last_message.preview}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/40 italic truncate mt-0.5">
                No messages yet
              </p>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}
