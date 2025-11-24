import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, MessageSquare, Send, User, ChevronRight, Plus, X, ChevronLeft, Check, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useClient, useConversations, useMessages, useSendMessage, useStartConversation, CachedConversation } from "@xmtp/react-sdk";
import { formatDistanceToNow } from "date-fns";
import { MiniKit } from "@worldcoin/minikit-js";

interface XMTPInboxProps {
  profileAddress?: string;
  currentUserAddress?: string;
  isProfileOwner?: boolean;
}

const createWorldAppSigner = (address: string) => {
  return {
    getAddress: async () => address.toLowerCase() as `0x${string}`,
    signMessage: async (message: string) => {
      console.log('[XMTP] Signing message with World App...');
      
      const { finalPayload } = await MiniKit.commandsAsync.signMessage({
        message,
      });
      
      if (!finalPayload || finalPayload.status !== 'success') {
        throw new Error('World App signature request failed or was cancelled');
      }
      
      console.log('[XMTP] Message signed successfully');
      // Return signature as hex string
      return finalPayload.signature;
    },
  };
};

export const XMTPInbox = ({ 
  profileAddress, 
  currentUserAddress,
  isProfileOwner = false 
}: XMTPInboxProps) => {
  const { client, error: xmtpError, initialize, isLoading: xmtpLoading } = useClient();
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const [activeConversation, setActiveConversation] = useState<CachedConversation | null>(null);
  const { messages, isLoading: messagesLoading } = useMessages(activeConversation);
  const { sendMessage } = useSendMessage();
  const { startConversation } = useStartConversation();
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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
      console.error("[XMTP] Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleStartNewConversation = () => {
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

  const handleInitialize = async () => {
    if (!MiniKit.isInstalled()) {
      toast({
        title: "World App not installed",
        description: "Please open this app in World App to use messaging",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('[XMTP] Authenticating with World App...');

      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: crypto.randomUUID().replace(/-/g, ''),
        statement: 'Sign in to Vanity.box messaging',
      });

      if (!finalPayload || finalPayload.status !== 'success') {
        throw new Error('Wallet authentication failed');
      }

      const address = finalPayload.address;
      if (!address) {
        throw new Error('No wallet address returned');
      }

      console.log('[XMTP] Authenticated with wallet:', address);

      const signer = createWorldAppSigner(address);
      
      console.log('[XMTP] Initializing client...');
      await initialize({ signer });
      console.log('[XMTP] Client initialized successfully');
    } catch (error) {
      console.error('[XMTP] Failed to initialize:', error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to XMTP",
        variant: "destructive",
      });
    }
  };

  // If not initialized
  if (!client && !xmtpLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-background">
        <MessageSquare className="w-16 h-16 text-[#D4AF37] opacity-50" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Initialize Messaging</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Connect to XMTP V3 to start messaging with other users securely
          </p>
        </div>
        {xmtpError && (
          <p className="text-sm text-red-500">{xmtpError.message}</p>
        )}
        <Button 
          onClick={handleInitialize}
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
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-background">
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

  // Main inbox UI
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between flex-shrink-0">
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
        <div className="p-4 border-b border-border/30 space-y-2 flex-shrink-0">
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
            {conversationsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#D4AF37] animate-spin" />
                <p className="text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            ) : conversations && conversations.length > 0 ? (
              conversations.map((conv) => (
                <button
                  key={conv.topic}
                  onClick={() => setActiveConversation(conv)}
                  className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
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
            <div className="p-3 border-b border-border/30 flex items-center gap-2 flex-shrink-0">
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
              {messagesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#D4AF37] animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              ) : messages && messages.length > 0 ? (
                messages.map((msg) => {
                  const isOwn = msg.senderAddress.toLowerCase() === client?.address?.toLowerCase();
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
                        <div className="text-sm break-words">{msg.content}</div>
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
          <div className="p-4 border-t border-border/30 flex-shrink-0">
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
                className="flex-1"
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
