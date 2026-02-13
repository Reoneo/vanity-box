import { useState } from "react";
import { X, Search, MessageSquarePlus } from "lucide-react";

interface NewConversationModalProps {
  onClose: () => void;
  onStart: (recipientDomain: string) => void;
}

export function NewConversationModal({ onClose, onStart }: NewConversationModalProps) {
  const [recipientDomain, setRecipientDomain] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    const domain = recipientDomain.trim().toLowerCase();
    if (!domain) return;
    setIsStarting(true);
    await onStart(domain);
    setIsStarting(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h2 className="text-base font-bold text-foreground">New Message</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Recipient domain
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                value={recipientDomain}
                onChange={(e) => setRecipientDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="e.g. alice.iota, bob.eth"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted text-foreground text-sm placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                autoFocus
              />
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={!recipientDomain.trim() || isStarting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-40"
          >
            <MessageSquarePlus className="w-4 h-4" />
            {isStarting ? "Starting…" : "Start Conversation"}
          </button>
        </div>
      </div>
    </div>
  );
}
