import { MessageSquare } from "lucide-react";
import type { Conversation } from "@/hooks/useMessaging";

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  domain: string;
}

export function ConversationList({ conversations, onSelect, domain }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground text-sm">No conversations yet</p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          Start a new conversation using the + button
        </p>
      </div>
    );
  }

  // Sort conversations by last message time (most recent first)
  const sorted = [...conversations].sort((a, b) => {
    const aTime = a.last_message?.sent_at || a.updated_at || a.created_at;
    const bTime = b.last_message?.sent_at || b.updated_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className="flex-1 overflow-y-auto">
      {sorted.map((conv) => {
        const otherMembers = conv.members.filter(
          (m) => m.domain_name?.toLowerCase() !== domain?.toLowerCase()
        );
        const displayName =
          otherMembers[0]?.display_name || otherMembers[0]?.domain_name || "Unknown";
        const avatarUrl = otherMembers[0]?.avatar_url;

        const timeLabel = conv.last_message?.sent_at
          ? formatTimeAgo(new Date(conv.last_message.sent_at))
          : formatTimeAgo(new Date(conv.updated_at || conv.created_at));

        return (
          <button
            key={conv.conversation_id}
            onClick={() => onSelect(conv.conversation_id)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors border-b border-border/30 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-[#D4AF37] font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {displayName}
              </p>
              {conv.last_message ? (
                <p className="text-xs text-muted-foreground truncate">
                  {conv.last_message.preview}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic truncate">
                  No messages yet
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
              {timeLabel}
            </span>
          </button>
        );
      })}
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
