import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Send, Loader2, MessageCircle, ArrowLeft, X, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useXmtp } from "@/contexts/XmtpContext";
import { authenticateWithWorldChain } from "@/lib/worldChainAuth";
import { MiniKit } from "@worldcoin/minikit-js";
import { formatDistanceToNow } from "date-fns";
import { useWorldNotifications } from "@/hooks/useWorldNotifications";
import { soundManager } from "@/utils/soundEffects";
import { XMTPSettings } from "@/components/XMTPSettings";

interface Conversation {
  id: string;
  peerAddress: string;
  dmPeerInboxId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

// Helper to safely get peer identifier from conversation
const getPeerIdentifier = async (conv: any, client: any): Promise<string> => {
  // Check if it's a DM with dmPeerInboxId (XMTP SDK v5+)
  if (conv.dmPeerInboxId) {
    try {
      // Fetch the inbox state to get Ethereum address
      const inboxStates = await client.inboxStateFromInboxIds([conv.dmPeerInboxId]);
      if (inboxStates && inboxStates.length > 0) {
        const addresses = inboxStates[0]?.identifiers
          ?.filter((i: any) => i.identifierKind === 'Ethereum')
          ?.map((i: any) => i.identifier);
        if (addresses && addresses.length > 0) {
          return addresses[0];
        }
      }
      // Fallback to inbox ID if we can't get the address
      return conv.dmPeerInboxId;
    } catch (error) {
      console.warn('Failed to fetch address for inbox ID:', conv.dmPeerInboxId, error);
      return conv.dmPeerInboxId;
    }
  }
  
  // Fallback to peerAddress (old SDK or already has address)
  return conv.peerAddress || conv.id || 'Unknown';
}

export const MessagingInterface = ({ onClose }: { onClose?: () => void }) => {
  const { client, isInitializing, isConnected, initializeClient, walletAddress } = useXmtp();
  const { hasPermission, isRequesting, requestPermission } = useWorldNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect to XMTP
  const handleConnect = async () => {
    // Prevent multiple concurrent connection attempts
    if (isConnecting || isInitializing) {
      console.log('⚠️ Connection already in progress, ignoring click');
      return;
    }
    
    setIsConnecting(true);
    try {
      if (!MiniKit.isInstalled()) {
        toast.error("Please open this app in World App to use messaging");
        setIsConnecting(false);
        return;
      }

      console.log("🔄 Connecting to XMTP via World Chain");
      const { address, signer } = await authenticateWithWorldChain();
      console.log("✅ Got World Chain credentials, initializing XMTP client");
      await initializeClient(signer, address);
      console.log("✅ XMTP client initialized");
      toast.success("Connected to XMTP!");
    } catch (error: any) {
      console.error("❌ XMTP connection error:", error);
      toast.error(error.message || "Failed to connect to XMTP");
    } finally {
      setIsConnecting(false);
    }
  };

  // Load conversations after client is connected
  useEffect(() => {
    if (!client || !isConnected) return;

    const loadConversations = async () => {
      setIsLoadingConversations(true);
      try {
        console.log("🔄 Loading conversations");
        
        // Sync conversations from network first
        await client.conversations.sync();
        
        const convos = await client.conversations.list();
        console.log(`📋 Found ${convos.length} conversations`);
        
        const conversationsData: Conversation[] = await Promise.all(
          convos.map(async (conv: any) => {
            try {
              // Sync messages for this conversation
              await conv.sync();
              const msgs = await conv.messages({ limit: 1 });
              const lastMsg = msgs[0];
              
              // Safely get peer identifier (supports both old and new SDK)
              const peerAddress = await getPeerIdentifier(conv, client);
              
              return {
                id: conv.id,
                peerAddress,
                dmPeerInboxId: conv.dmPeerInboxId,
                lastMessage: lastMsg?.content || "",
                lastMessageTime: lastMsg?.sentAt ? new Date(lastMsg.sentAt) : undefined,
                unreadCount: 0
              };
            } catch (convError) {
              console.warn(`⚠️ Error loading conversation ${conv.id}:`, convError);
              // Safe fallback with getPeerIdentifier
              const peerAddress = await getPeerIdentifier(conv, client);
              return {
                id: conv.id,
                peerAddress,
                dmPeerInboxId: conv.dmPeerInboxId,
                lastMessage: "",
                lastMessageTime: undefined,
                unreadCount: 0
              };
            }
          })
        );

        setConversations(conversationsData.sort((a, b) => 
          (b.lastMessageTime?.getTime() || 0) - (a.lastMessageTime?.getTime() || 0)
        ));
        console.log("✅ Loaded conversations:", conversationsData.length);
      } catch (error: any) {
        console.error("❌ Failed to load conversations:", error);
        const errorMessage = error.message || "Failed to load conversations";
        toast.error(errorMessage.includes('already registered') 
          ? "XMTP installation limit reached. Clear browser data and try again." 
          : "Failed to load conversations");
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [client, isConnected]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      try {
        console.log("🔄 Loading messages for conversation");
        
        // Sync messages first to get latest
        await selectedConversation.sync();
        
        const msgs = await selectedConversation.messages();
        console.log(`💬 Loaded ${msgs.length} messages`);
        setMessages(msgs);
      } catch (error) {
        console.error("❌ Failed to load messages:", error);
        toast.error("Failed to load messages");
      }
    };

    loadMessages();
  }, [selectedConversation]);

  // Stream new messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    let isSubscribed = true;

    const streamMessages = async () => {
      try {
        for await (const message of await selectedConversation.streamMessages()) {
          if (isSubscribed) {
            setMessages((prev) => [...prev, message]);
            
            // Send notification for incoming messages (not from us)
            if (message.senderAddress?.toLowerCase() !== walletAddress?.toLowerCase() && walletAddress) {
              console.log('📲 New incoming message, sending notification');
              
              // Play sound notification
              soundManager.playMessage();
              
              // Send notification
              try {
                await supabase.functions.invoke('send-world-notification', {
                  body: {
                    wallet_address: walletAddress,
                    sender_address: message.senderAddress,
                    message_preview: message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                  }
                });
              } catch (notifError) {
                console.error('❌ Failed to send notification:', notifError);
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Message streaming error:", error);
      }
    };

    streamMessages();

    return () => {
      isSubscribed = false;
    };
  }, [selectedConversation, walletAddress]);

  // Stream all conversations for unread count updates
  useEffect(() => {
    if (!client || !isConnected) return;

    let isSubscribed = true;

    const streamAllMessages = async () => {
      try {
        const stream = await client.conversations.streamAllMessages();
        
        for await (const message of stream) {
          if (!isSubscribed) break;
          
          // Check if message is a text message and from someone else
          if (typeof message.content === 'string' && message.senderInboxId !== client.inboxId) {
            const conversationId = message.conversationId;
            
            // Only increment if this conversation isn't currently selected
            if (!selectedConversation || selectedConversation.id !== conversationId) {
              // Play sound for new message
              soundManager.playMessage();
              
              setConversations(prev => 
                prev.map(conv => {
                  if (conv.id === conversationId) {
                    return {
                      ...conv,
                      unreadCount: (conv.unreadCount || 0) + 1,
                      lastMessage: typeof message.content === 'string' ? message.content : '',
                      lastMessageTime: new Date(Number(message.sentAtNs) / 1_000_000)
                    };
                  }
                  return conv;
                })
              );
            }
          }
        }
      } catch (error) {
        console.error("❌ All messages streaming error:", error);
      }
    };

    streamAllMessages();

    return () => {
      isSubscribed = false;
    };
  }, [client, isConnected, selectedConversation]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (!selectedConversation) return;

    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === selectedConversation.id) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      })
    );
  }, [selectedConversation]);

  // Start new conversation
  const handleStartConversation = async () => {
    if (!searchQuery.trim() || !client) return;

    try {
      console.log("🔄 Creating conversation with:", searchQuery);
      const newConvo = await client.conversations.newDm(searchQuery.toLowerCase());
      setSelectedConversation(newConvo);
      
      // Add to conversations list if not already there
      const exists = conversations.find((c) => c.peerAddress?.toLowerCase() === searchQuery.toLowerCase());
      if (!exists) {
        setConversations([
          {
            id: newConvo.id,
            peerAddress: searchQuery.toLowerCase(),
            lastMessage: "",
            lastMessageTime: new Date()
          },
          ...conversations
        ]);
      }
      
      setSearchQuery("");
      toast.success("Conversation started");
    } catch (error) {
      console.error("❌ Failed to start conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      await selectedConversation.send(messageText);
      setMessageText("");
      
      // Refresh messages to include the sent message
      const msgs = await selectedConversation.messages();
      setMessages(msgs);
      
      console.log("✅ Message sent");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Not connected view
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <MessageCircle className="w-16 h-16 text-primary" />
            <h2 className="text-2xl font-semibold">Secure Messaging</h2>
            <p className="text-muted-foreground">
              Connect your World Chain wallet to send encrypted messages via XMTP
            </p>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || isInitializing} 
              size="lg" 
              className="w-full"
            >
              {(isConnecting || isInitializing) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect to XMTP"
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Main messaging interface
  return (
    <div className="flex h-screen bg-background relative">
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      )}
      
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-border flex-col`}>
        {/* Search Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h2 className="text-xl font-semibold">Messages</h2>
              {conversations.some(c => (c.unreadCount || 0) > 0) && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 flex items-center justify-center">
                  {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <XMTPSettings />
              <Button
                variant="ghost"
                size="icon"
                onClick={requestPermission}
                disabled={isRequesting}
                className="h-8 w-8"
                title={hasPermission ? "Notifications enabled" : "Notifications disabled"}
              >
                {hasPermission ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </Button>
              <Badge variant={hasPermission ? "secondary" : "outline"} className="text-xs px-2">
                {hasPermission ? "On" : "Off"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter address or ENS..."
              onKeyPress={(e) => e.key === "Enter" && handleStartConversation()}
              className="flex-1"
            />
            <Button onClick={handleStartConversation} size="icon" disabled={!searchQuery.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Search for an address to start messaging</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={async () => {
                  try {
                    const convos = await client?.conversations.list();
                    const fullConvo: any = convos?.find((c: any) => c.id === conv.id);
                    
                    if (fullConvo) {
                      // Ensure we have peerAddress for display
                      if (!fullConvo.peerAddress && fullConvo.dmPeerInboxId && client) {
                        fullConvo.peerAddress = await getPeerIdentifier(fullConvo, client);
                      }
                      setSelectedConversation(fullConvo);
                    }
                  } catch (error) {
                    console.error('Failed to select conversation:', error);
                    toast.error('Failed to open conversation');
                  }
                }}
                className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversation?.id === conv.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
                    <span className="text-sm font-medium text-primary">
                      {conv.peerAddress?.slice(2, 4)?.toUpperCase() || '??'}
                    </span>
                    {(conv.unreadCount || 0) > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-destructive-foreground">
                          {conv.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${(conv.unreadCount || 0) > 0 ? 'font-bold' : 'font-medium'}`}>
                        {conv.peerAddress 
                          ? `${conv.peerAddress.slice(0, 6)}...${conv.peerAddress.slice(-4)}`
                          : conv.dmPeerInboxId || 'Unknown'
                        }
                      </p>
                      {conv.lastMessageTime && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(conv.lastMessageTime, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className={`text-sm truncate mt-1 ${(conv.unreadCount || 0) > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {conv.lastMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {(selectedConversation.peerAddress?.slice(2, 4)?.toUpperCase() || 
                    selectedConversation.dmPeerInboxId?.slice(0, 2)?.toUpperCase() || 
                    '??')}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {selectedConversation.peerAddress 
                    ? `${selectedConversation.peerAddress.slice(0, 6)}...${selectedConversation.peerAddress.slice(-4)}`
                    : selectedConversation.dmPeerInboxId || 'Unknown'
                  }
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedConversation.peerAddress || selectedConversation.dmPeerInboxId || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  // Compare sender address with our wallet address
                  const isOurMessage = msg.senderAddress?.toLowerCase() === walletAddress?.toLowerCase();
                  return (
                    <div
                      key={idx}
                      className={`flex ${isOurMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          isOurMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                        {msg.sentAt && (
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim()} size="icon">
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
