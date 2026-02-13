import { useState, useRef, useEffect } from "react";
import { Send, Shield, ShieldCheck } from "lucide-react";
import type { DecryptedMessage } from "@/hooks/useMessaging";

interface ChatThreadProps {
  messages: DecryptedMessage[];
  onSend: (text: string) => Promise<void>;
  domain: string;
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
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground/50 text-sm py-12">
            <Shield className="w-8 h-8 mx-auto mb-2 text-[#D4AF37]/40" />
            <p>Messages are end-to-end encrypted.</p>
            <p className="text-xs mt-1">Only you and the recipient can read them.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.message_id}
            className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.isOwn
                  ? "bg-[#D4AF37] text-black rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {!msg.isOwn && (
                <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                  {msg.sender_domain}
                </p>
              )}
              <p className="text-sm leading-relaxed break-words">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[10px] opacity-50">
                  {new Date(msg.sent_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {msg.notarized && (
                  <ShieldCheck className="w-3 h-3 opacity-60" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2.5 rounded-full bg-muted text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
