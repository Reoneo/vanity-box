import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, MessageSquare, Send, User, ChevronRight, Plus, Search, X, ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Client, Conversation, DecodedMessage } from "@xmtp/xmtp-js";
import { formatDistanceToNow } from "date-fns";
import { useWorldXmtpClient, resetXmtpInstallation } from "@/hooks/useWorldXmtpClient";

interface Message {
  id: string;
  content: string;
  senderAddress: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Load messages for a conversation
  const loadConversationMessages = async (conv: Conversation): Promise<Message[]> => {
    try {
      const msgs = await conv.messages();
      return msgs.map((m: DecodedMessage) => ({
        id: m.id,
        content: m.content as string,
        senderAddress: m.senderAddress,
        timestamp: m.sent,
      }));
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    }
  };

  // Listen for new messages
  useEffect(() => {
    if (!client || !isProfileOwner || !activeConversation) return;

    let isCancelled = false;

    const setupMessageStream = async () => {
      try {
        const stream = await activeConversation.streamMessages();
        for await (const message of stream) {
          if (isCancelled) break;
          console.log('[XMTP] New message received');
          const msgs = await loadConversationMessages(activeConversation);
          setMessages(msgs);
        }
      } catch (error) {
        console.error('[XMTP] Stream error:', error);
      }
    };

    setupMessageStream();

    return () => {
      isCancelled = true;
    };
  }, [client, isProfileOwner, activeConversation]);

  // Load conversations when client ready (profile owner only)
  useEffect(() => {
    if (!client || !isProfileOwner) return;

    const load = async () => {
      try {
        const convs = await client.conversations.list();
        setConversations(convs);
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
      let targetConv: Conversation | undefined;

      // If profile owner viewing inbox
      if (isProfileOwner && activeConversation) {
        targetConv = activeConversation;
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

        // Check if recipient can receive messages
        const canMessage = await client.canMessage(profileAddress);
        if (!canMessage) {
          toast({
            title: "Recipient not on XMTP yet",
            description: "They need to enable XMTP messaging first",
            variant: "destructive",
          });
          return;
        }

        // Find or create conversation
        targetConv = conversations.find(c => c.peerAddress.toLowerCase() === profileAddress.toLowerCase());
        
        if (!targetConv) {
          targetConv = await client.conversations.newConversation(profileAddress);
          setConversations((prev) => [targetConv!, ...prev]);
        }
      }

      if (!targetConv) {
        toast({
          title: "Error",
          description: "Could not create conversation",
          variant: "destructive",
        });
        return;
      }

      // Send message
      await targetConv.send(messageInput);
      setMessageInput("");

      // Reload messages
      const updatedMessages = await loadConversationMessages(targetConv);
      setMessages(updatedMessages);

      toast({
        title: "Message sent",
        description: "✓ Delivered",
      });
    } catch (err: any) {
      console.error("Send error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to send message",
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
      <div className="flex flex-col items-center justify-center py-16 space-y-4 px-4">
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center space-y-3 max-w-md">
          <p className="text-base font-semibold">Connection Failed</p>
          <p className="text-sm text-muted-foreground">{xmtpError.message}</p>
          <Button
            variant="destructive"
            onClick={() => {
              if (walletAddress) {
                resetXmtpInstallation(walletAddress);
                toast({
                  title: "XMTP Reset",
                  description: "Please refresh the page to reconnect",
                });
                setTimeout(() => window.location.reload(), 2000);
              }
            }}
          >
            Reset & Reconnect
          </Button>
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
    <div className="flex flex-col h-full relative bg-background" style={{ minHeight: '400px' }}>
      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-background border-b border-border shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter wallet address or ENS..."
                className="pl-10 pr-4"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    try {
                      const targetAddress = searchQuery.trim();
                      
                      // Check if they can receive messages
                      const canMessage = await client.canMessage(targetAddress);
                      if (!canMessage) {
                        toast({
                          title: "Cannot message",
                          description: "This address is not on XMTP yet",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Create conversation
                      const conv = await client.conversations.newConversation(targetAddress);
                      setConversations((prev) => [conv, ...prev]);
                      setActiveConversation(conv);
                      setShowSearch(false);
                      setSearchQuery("");
                    } catch (error) {
                      console.error("Error starting conversation:", error);
                      toast({
                        title: "Error",
                        description: "Could not start conversation",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        {activeConversation && isProfileOwner ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveConversation(null)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium truncate">
                {activeConversation.peerAddress.slice(0, 8)}...{activeConversation.peerAddress.slice(-6)}
              </p>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold">Messages</h3>
            {isProfileOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(true)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Conversation List */}
      {isProfileOwner && !activeConversation && (
        <div className="flex-1 overflow-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">No conversations</h3>
              <p className="text-sm text-muted-foreground">
                Start a new conversation using the + button
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conv) => (
                <button
                  key={conv.peerAddress}
                  onClick={() => setActiveConversation(conv)}
                  className="w-full text-left p-3 rounded-lg transition-all hover:bg-muted/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.peerAddress.slice(0, 8)}...{conv.peerAddress.slice(-6)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Display */}
      {(activeConversation || !isProfileOwner) && (
        <>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Say hi! 👋
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderAddress.toLowerCase() === walletAddress?.toLowerCase();
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isMine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={!messageInput.trim() || sending}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
