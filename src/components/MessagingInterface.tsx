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
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

interface Conversation {
  id: string;
  peerAddress: string;
  dmPeerInboxId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

// Helper to resolve ENS names or World Chain names to Ethereum addresses
const resolveAddressOrENS = async (input: string): Promise<string> => {
  const trimmed = input.trim().toLowerCase();
  
  // If it's already an Ethereum address
  if (trimmed.startsWith('0x') && trimmed.length === 42) {
    return trimmed;
  }
  
  // If it's an ENS name (.eth)
  if (trimmed.endsWith('.eth')) {
    try {
      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http()
      });
      
      const address = await publicClient.getEnsAddress({
        name: normalize(trimmed)
      });
      
      if (address) return address;
      throw new Error(`Could not resolve ENS name: ${trimmed}`);
    } catch (error) {
      console.error('ENS resolution failed:', error);
      throw new Error(`Failed to resolve ENS name: ${trimmed}`);
    }
  }
  
  // If it's a World Chain name (.world) or other Namestone domains (excluding .box)
  if (trimmed.endsWith('.world') || trimmed.endsWith('.cash') || trimmed.endsWith('.apt') || trimmed.endsWith('.ton')) {
    try {
      const response = await supabase.functions.invoke('get-namestone-records', {
        body: { subdomain: trimmed }
      });
      
      if (response.data?.textRecords?.['eth.addr']) {
        return response.data.textRecords['eth.addr'];
      }
      
      // Fallback to owner address if eth.addr not set
      if (response.data?.owner) {
        return response.data.owner;
      }
      
      throw new Error(`Could not resolve domain: ${trimmed}`);
    } catch (error) {
      console.error('Domain resolution failed:', error);
      throw new Error(`Failed to resolve domain: ${trimmed}`);
    }
  }
  
  // If it's a .box domain, resolve via ENS
  if (trimmed.endsWith('.box')) {
    try {
      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http()
      });
      
      const address = await publicClient.getEnsAddress({
        name: normalize(trimmed)
      });
      
      if (address) return address;
      throw new Error(`Could not resolve .box domain: ${trimmed}`);
    } catch (error) {
      console.error('.box domain resolution failed:', error);
      throw new Error(`Failed to resolve .box domain: ${trimmed}`);
    }
  }
  
  // Invalid format
  throw new Error('Please enter a valid Ethereum address, .eth, .world, or .box name');
};

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
  const [isResolvingENS, setIsResolvingENS] = useState(false);
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

    setIsResolvingENS(true);
    try {
      console.log("🔄 Resolving address/ENS for:", searchQuery);
      
      // Resolve ENS name or validate address
      const resolvedAddress = await resolveAddressOrENS(searchQuery);
      console.log("✅ Resolved to address:", resolvedAddress);
      
      // Create conversation with resolved address
      console.log("🔄 Creating conversation with:", resolvedAddress);
      const newConvo: any = await client.conversations.newDm(resolvedAddress);
      
      // Ensure peerAddress is set on the conversation object
      if (!newConvo.peerAddress && newConvo.peerInboxId) {
        newConvo.peerAddress = await getPeerIdentifier(newConvo, client);
      } else if (!newConvo.peerAddress) {
        newConvo.peerAddress = resolvedAddress;
      }
      
      setSelectedConversation(newConvo);
      
      // Add to conversations list if not already there
      const exists = conversations.find((c) => 
        c.peerAddress?.toLowerCase() === resolvedAddress.toLowerCase()
      );
      
      if (!exists) {
        setConversations([
          {
            id: newConvo.id,
            peerAddress: resolvedAddress,
            dmPeerInboxId: newConvo.peerInboxId || newConvo.dmPeerInboxId,
            lastMessage: "",
            lastMessageTime: new Date()
          },
          ...conversations
        ]);
      }
      
      setSearchQuery("");
      toast.success(`Conversation started with ${searchQuery}`);
    } catch (error: any) {
      console.error("❌ Failed to start conversation:", error);
      toast.error(error.message || "Failed to start conversation");
    } finally {
      setIsResolvingENS(false);
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
      <div className="flex items-start justify-center min-h-screen bg-background p-4 pt-20">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || isInitializing} 
              size="lg" 
              className="w-full touch-manipulation active:scale-95 transition-transform"
              style={{ touchAction: 'manipulation' }}
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
            <MessageCircle className="w-16 h-16 text-primary mt-4" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Secure Messaging</h2>
              <p className="text-muted-foreground">
                Connect your World Chain wallet to send encrypted messages via XMTP
              </p>
            </div>
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
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-xl font-semibold">Messages</h2>
            {conversations.some(c => (c.unreadCount || 0) > 0) && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 flex items-center justify-center">
                {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={requestPermission}
              disabled={isRequesting}
              className="h-9 w-9"
              title={hasPermission ? "Notifications enabled" : "Notifications disabled"}
            >
              {hasPermission ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            <Badge variant={hasPermission ? "secondary" : "outline"} className="text-xs px-2 py-0.5">
              {hasPermission ? "On" : "Off"}
            </Badge>
            <XMTPSettings />
          </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter address, .eth, .world, or .box..."
              onKeyPress={(e) => e.key === "Enter" && handleStartConversation()}
              className="flex-1"
              disabled={isResolvingENS}
            />
            <Button 
              onClick={handleStartConversation} 
              disabled={isLoadingConversations || isResolvingENS || !searchQuery.trim()}
              className="min-w-[80px]"
            >
              {isResolvingENS ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Start
                </>
              )}
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
                      } else if (!fullConvo.peerAddress && conv.peerAddress) {
                        fullConvo.peerAddress = conv.peerAddress;
                      }
                      
                      console.log('📱 Selected conversation:', fullConvo.id, 'with peer:', fullConvo.peerAddress);
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
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center gap-3 shrink-0">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
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
            <div className="p-4 border-t border-border shrink-0 bg-background">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSending}
                  className="flex-1"
                  autoFocus
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isSending || !messageText.trim()} 
                  size="icon"
                  className="shrink-0"
                >
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
