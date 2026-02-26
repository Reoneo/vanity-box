import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Shield, ShieldCheck } from "lucide-react";
import type { DecryptedMessage } from "@/hooks/useMessaging";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

interface ChatThreadProps {
  messages: DecryptedMessage[];
  onSend: (text: string) => Promise<void>;
  domain: string;
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMMM yyyy");
}

function formatTimestamp(date: Date): string {
  return format(date, "HH:mm");
}

export function ChatThread({ messages, onSend, domain }: ChatThreadProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: DecryptedMessage[] }[] = [];
    messages.forEach((msg) => {
      const msgDate = new Date(msg.sent_at);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && isSameDay(lastGroup.date, msgDate)) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date: msgDate, messages: [msg] });
      }
    });
    return groups;
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await onSend(text);
    } catch {
      // Error handled in hook
    }
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--accent))]/10 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-[hsl(43,76%,52%)]" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Messages are end-to-end encrypted</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Only you and the recipient can read them. Not even vanity.box has access.
            </p>
          </div>
        )}

        {groupedMessages.map((group, gi) => (
          <div key={gi}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-medium tracking-wide">
                {formatDateSeparator(group.date)}
              </span>
            </div>

            {/* Messages in this date group */}
            <div className="space-y-2">
              {group.messages.map((msg, mi) => {
                const isOwn = msg.isOwn;
                const showSender = !isOwn && (mi === 0 || group.messages[mi - 1]?.isOwn);

                return (
                  <div
                    key={msg.message_id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] flex ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2`}>
                      {!isOwn && (
                        <Avatar className="w-7 h-7 flex-shrink-0 mt-auto">
                          {msg.sender_avatar ? (
                            <AvatarImage src={msg.sender_avatar} alt={msg.sender_domain} />
                          ) : null}
                          <AvatarFallback className="bg-muted text-[10px] font-bold text-muted-foreground">
                            {(msg.sender_domain || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                        {showSender && (
                          <span className="text-[10px] font-semibold text-muted-foreground ml-1 mb-0.5">
                            {msg.sender_domain}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2 ${
                            isOwn
                              ? "bg-[hsl(43,76%,52%)] text-black rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          }`}
                        >
                          <p className="text-[14px] leading-relaxed break-words">{msg.text}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "mr-1 justify-end" : "ml-1 justify-start"}`}>
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatTimestamp(new Date(msg.sent_at))}
                          </span>
                          {msg.notarized && (
                            <ShieldCheck className="w-2.5 h-2.5 text-muted-foreground/50" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Composer — positioned above dock (dock is at bottom: 3rem, ~48px tall + padding) */}
      <div className="flex-shrink-0 px-3 pb-[100px] pt-2 bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-2 rounded-full bg-muted border border-border/50 px-1 py-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/50 outline-none"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-full bg-[hsl(43,76%,52%)] text-black hover:bg-[hsl(43,76%,52%)]/90 transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
