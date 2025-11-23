import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, MessageSquare, Send, User, Mail, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@xmtp/browser-sdk";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useWorldXmtpClient } from "@/hooks/useWorldXmtpClient";
import { MiniKit } from "@worldcoin/minikit-js";

import type { Dm } from '@xmtp/browser-sdk';

interface Message {
  id: string;
  content: string;
  senderAddress: string;
  timestamp: Date;
}

interface XMTPInboxProps {
  profileAddress?: string;
  currentUserAddress?: string;
  isProfileOwner?: boolean;
}

export const XMTPInbox = ({ 
  profileAddress, 
  currentUserAddress,
  isProfileOwner = false 
}: XMTPInboxProps) => {
  const { client, loading: xmtpLoading, error: xmtpError, walletAddress } = useWorldXmtpClient();
  const [conversations, setConversations] = useState<Dm[]>([]);
  const [activeConversation, setActiveConversation] = useState<Dm | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Load messages for a specific conversation
  const loadConversationMessages = async (dm: Dm) => {
    try {
      const msgs = await dm.messages();
      const formatted: Message[] = msgs.map((m) => ({
        id: m.id,
        content: typeof m.content === 'string' ? m.content : '',
        senderAddress: (m as any).senderInboxId || '',
        timestamp: (m as any).sentAt || new Date(),
      }));
      return formatted;
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    }
  };

  // Listen for new messages
  useEffect(() => {
    if (!client || !isProfileOwner) return;

    const setupMessageStream = async () => {
      try {
        const stream = await client.conversations.streamAllMessages();
        for await (const message of stream) {
          const senderInboxId = (message as any).senderInboxId || '';
          if (senderInboxId && senderInboxId !== client.inboxId) {
            // Reload conversations
            const dms = await client.conversations.listDms();
            setConversations(dms);
          }
        }
      } catch (error) {
        console.error('XMTP stream error:', error);
      }
    };

    setupMessageStream();
  }, [client, isProfileOwner]);

  // Load conversations when client ready (profile owner only)
  useEffect(() => {
    if (!client || !isProfileOwner) return;

    const load = async () => {
      try {
        const dms = await client.conversations.listDms();
        setConversations(dms);
      } catch (error) {
        console.error("Error loading conversations:", error);
      }
    };

    load();
  }, [client, isProfileOwner]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const load = async () => {
      const msgs = await loadConversationMessages(activeConversation);
      setMessages(msgs);
    };

    load();
  }, [activeConversation]);

  // Send message
  const sendMessage = async () => {
    if (!client || !messageInput.trim() || sending) return;

    try {
      setSending(true);
      let targetDm: Dm | undefined;

      // If profile owner viewing inbox
      if (isProfileOwner && activeConversation) {
        targetDm = activeConversation;
      } else {
        // Visitor sending to profile owner
        if (!profileAddress) {
          toast({
            title: "Error",
            description: "Profile address not found",
            variant: "destructive",
          });
          return;
        }

        // Check if recipient has XMTP
        const canMessageResult = await client.canMessage([{
          identifier: profileAddress,
          identifierKind: 'Ethereum' as const,
        }]);
        if (!canMessageResult[profileAddress.toLowerCase()]) {
          toast({
            title: "XMTP Identity Not Found",
            description: "This user hasn't created an XMTP identity yet. They need to open the Messages tab first to enable messaging.",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        // Find or create DM
        targetDm = await (async () => {
          for (const conv of conversations) {
            const convPeerInboxId = await (typeof conv.peerInboxId === 'function' 
              ? conv.peerInboxId() 
              : Promise.resolve(conv.peerInboxId));
            if (typeof convPeerInboxId === 'string' && convPeerInboxId.toLowerCase() === profileAddress.toLowerCase()) {
              return conv;
            }
          }
          return undefined;
        })();

        if (!targetDm) {
          targetDm = await client.conversations.newDm(profileAddress);
          setConversations((prev) => [targetDm!, ...prev]);
        }
      }

      if (!targetDm) {
        toast({
          title: "Error",
          description: "Could not create conversation",
          variant: "destructive",
        });
        return;
      }

      // Send
      await targetDm.send(messageInput);
      setMessageInput("");

      // Reload messages
      const updatedMessages = await loadConversationMessages(targetDm);
      setMessages(updatedMessages);

      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
    } catch (err: any) {
      console.error("Send error:", err);
      toast({
        title: "Failed to send",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Loading state
  if (xmtpLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <MessageSquare className="absolute inset-0 m-auto w-6 h-6 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-base font-medium">Connecting to XMTP</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please confirm the prompts in World App to enable messaging
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (xmtpError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <p className="text-base font-semibold">Connection Failed</p>
          <p className="text-sm text-muted-foreground">{xmtpError.message}</p>
          <p className="text-xs text-muted-foreground/70">
            Try refreshing the page or check your World App connection
          </p>
        </div>
      </div>
    );
  }

  // Not in World App
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="p-4 rounded-full bg-muted">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <p className="text-base font-medium">World App Required</p>
          <p className="text-sm text-muted-foreground">
            XMTP messaging is only available when using Vanity.box through World App
          </p>
        </div>
      </div>
    );
  }

  // Main inbox UI
  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Conversation List - Only for profile owner */}
      {isProfileOwner && (
        <div className="border-b border-border bg-muted/30 flex-shrink-0">
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Inbox</h3>
              {conversations.length > 0 && (
                <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {conversations.length}
                </span>
              )}
            </div>
          </div>
          <div className="h-52 overflow-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">No messages yet</p>
                <p className="text-xs text-muted-foreground">
                  Your conversations will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map((dm) => {
                  const peerInboxIdRaw = dm.peerInboxId;
                  const displayId = (typeof peerInboxIdRaw === 'string' ? peerInboxIdRaw : dm.id);
                  
                  return (
                    <button
                      key={dm.id}
                      onClick={() => setActiveConversation(dm)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all",
                        activeConversation?.id === dm.id
                          ? "bg-primary/15 border border-primary/30 shadow-sm"
                          : "hover:bg-muted/60 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate mb-0.5">
                            {typeof displayId === 'string' ? `${displayId.slice(0, 8)}...${displayId.slice(-6)}` : 'Conversation'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tap to view conversation
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Display */}
      <div className="flex-1 overflow-auto p-4 bg-background/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Send className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-2">
              {isProfileOwner 
                ? "No messages yet" 
                : "Start a conversation"
              }
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {isProfileOwner 
                ? "Select a conversation to view messages" 
                : `Send your first message to ${profileAddress?.slice(0, 6)}...${profileAddress?.slice(-4)}`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.senderAddress.toLowerCase() === walletAddress?.toLowerCase();
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    isOwn ? "justify-end" : "justify-start"
                  )}
                >
                  {!isOwn && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                    <p className={cn(
                      "text-xs mt-1.5 font-medium",
                      isOwn ? "opacity-80" : "opacity-60"
                    )}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isOwn && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !sending && sendMessage()}
              placeholder="Type your message..."
              disabled={sending}
              className="rounded-full px-4 py-2 h-auto min-h-[44px] resize-none"
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!messageInput.trim() || sending}
            size="icon"
            className="rounded-full h-11 w-11 flex-shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
