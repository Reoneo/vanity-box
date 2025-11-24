import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, MessageSquare, Send, User, ChevronRight, Plus, Search, X, ChevronLeft, Check, CheckCheck, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useClient, useConversations, useMessages, useSendMessage, useStartConversation, CachedConversation } from "@xmtp/react-sdk";
import { formatDistanceToNow } from "date-fns";
import { useWorldXmtpClient } from "@/hooks/useWorldXmtpClient";

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
  const { client, loading: xmtpLoading, error: xmtpError, walletAddress, initialize, reset } = useWorldXmtpClient();
  const { conversations } = useConversations();
  const [activeConversation, setActiveConversation] = useState<CachedConversation | null>(null);
  const { messages } = useMessages(activeConversation);
  const { sendMessage } = useSendMessage();
  const { startConversation } = useStartConversation();
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newRecipient, setNewRecipient] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle starting conversation with profile owner
  useEffect(() => {
    if (profileAddress && currentUserAddress && !isProfileOwner && client) {
      // If viewing someone else's profile and we're logged in, prepare to message them
      setNewRecipient(profileAddress);
    }
  }, [profileAddress, currentUserAddress, isProfileOwner, client]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending || !client) return;

    try {
      setSending(true);

      if (!activeConversation && newRecipient) {
        // Start new conversation
        const result = await startConversation(newRecipient, messageInput);
        if (result && result.cachedConversation) {
          setActiveConversation(result.cachedConversation);
          setNewRecipient("");
        }
      } else if (activeConversation) {
        // Send to active conversation
        await sendMessage(activeConversation, messageInput);
      }

      setMessageInput("");
      toast({
        title: "Message sent",
        description: "Your message was delivered successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleStartNewConversation = async () => {
    if (!newRecipient.trim()) {
      toast({
        title: "Invalid recipient",
        description: "Please enter a wallet address or ENS name",
        variant: "destructive",
      });
      return;
    }

    setShowSearch(false);
  };

  const handleResetAndReconnect = async () => {
    reset();
    await initialize();
  };

  // If not installed
  if (!client && !xmtpLoading && !xmtpError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <MessageSquare className="w-16 h-16 text-[#D4AF37] opacity-50" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Initialize Messaging</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Connect to XMTP V3 to start messaging with other users securely
          </p>
        </div>
        <Button 
          onClick={initialize}
          className="bg-[#D4AF37] hover:bg-[#C4A037] text-black"
        >
          Connect to XMTP V3
        </Button>
      </div>
    );
  }

  // Loading state
  if (xmtpLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="w-16 h-16 text-[#D4AF37] animate-spin" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Connecting to XMTP V3</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Setting up secure messaging...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (xmtpError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Connection Failed</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {xmtpError.message}
          </p>
        </div>
        <Button 
          onClick={handleResetAndReconnect}
          variant="outline"
          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
        >
          Reset & Reconnect
        </Button>
      </div>
    );
  }

  // Main inbox UI
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
          <h2 className="font-semibold">Messages</h2>
        </div>
        {isProfileOwner && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </Button>
        )}
      </div>

      {/* Search/New Conversation */}
      {showSearch && (
        <div className="p-4 border-b border-border/30 space-y-2">
          <Input
            placeholder="Enter wallet address or ENS name..."
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleStartNewConversation();
              }
            }}
          />
          <Button
            onClick={handleStartNewConversation}
            className="w-full bg-[#D4AF37] hover:bg-[#C4A037] text-black"
            size="sm"
          >
            Start Conversation
          </Button>
        </div>
      )}

      {/* Conversation List (for profile owner) */}
      {isProfileOwner && !activeConversation && (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations && conversations.length > 0 ? (
              conversations.map((conv) => (
                <button
                  key={conv.topic}
                  onClick={() => setActiveConversation(conv)}
                  className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">
                      {conv.peerAddress.slice(0, 6)}...{conv.peerAddress.slice(-4)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Tap to open conversation
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))
            ) : (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap + to start a new conversation
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Active Conversation */}
      {(activeConversation || newRecipient) && (
        <>
          {/* Conversation Header */}
          {activeConversation && (
            <div className="p-3 border-b border-border/30 flex items-center gap-2">
              {isProfileOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveConversation(null)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {activeConversation.peerAddress.slice(0, 6)}...{activeConversation.peerAddress.slice(-4)}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages && messages.length > 0 ? (
                messages.map((msg) => {
                  const isOwn = msg.senderAddress.toLowerCase() === walletAddress?.toLowerCase();
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-[#D4AF37] text-black'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <div className="text-sm">{msg.content}</div>
                        <div
                          className={`text-xs mt-1 flex items-center gap-1 ${
                            isOwn ? 'text-black/70' : 'text-muted-foreground'
                          }`}
                        >
                          <span>
                            {formatDistanceToNow(msg.sentAt, { addSuffix: true })}
                          </span>
                          {isOwn && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border/30">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sending}
                className="bg-[#D4AF37] hover:bg-[#C4A037] text-black"
                size="icon"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Not Profile Owner and No Active Conversation */}
      {!isProfileOwner && !activeConversation && !newRecipient && (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="space-y-4">
            <MessageSquare className="w-16 h-16 text-[#D4AF37] opacity-50 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Send a Message</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Start a conversation with this profile
              </p>
            </div>
            <Button
              onClick={() => profileAddress && setNewRecipient(profileAddress)}
              className="bg-[#D4AF37] hover:bg-[#C4A037] text-black"
            >
              <Send className="w-4 h-4 mr-2" />
              Message User
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
