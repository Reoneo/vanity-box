import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Inbox, Wallet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@xmtp/xmtp-js";
import { ethers } from "ethers";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Message {
  id: string;
  content: string;
  senderAddress: string;
  sent: Date;
}

interface Conversation {
  peerAddress: string;
  messages: Message[];
  lastMessageTime: Date;
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
  const [client, setClient] = useState<Client | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isConnected = !!currentUserAddress;
  const canMessage = isConnected && profileAddress;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeConversation]);

  const loadConversationMessages = async (conv: any, peerAddr: string) => {
    try {
      const msgs = await conv.messages();
      const formattedMessages: Message[] = msgs.map((m: any) => ({
        id: m.id,
        content: m.content,
        senderAddress: m.senderAddress,
        sent: m.sent,
      }));

      return {
        peerAddress: peerAddr,
        messages: formattedMessages,
        lastMessageTime: formattedMessages[formattedMessages.length - 1]?.sent || new Date(),
      };
    } catch (error) {
      console.error("Error loading messages:", error);
      return {
        peerAddress: peerAddr,
        messages: [],
        lastMessageTime: new Date(),
      };
    }
  };

  // Set up message streaming to listen for new messages
  useEffect(() => {
    if (!client || !isProfileOwner) return;

    let streamCleanup: (() => void) | null = null;

    const setupMessageStream = async () => {
      try {
        console.log('[XMTP] Setting up message stream...');
        
        // Stream all messages
        const stream = await client.conversations.streamAllMessages();
        
        for await (const message of stream) {
          console.log('[XMTP] New message received:', {
            from: message.senderAddress,
            content: message.content.substring(0, 50),
          });

          // Only notify if message is from someone else
          if (message.senderAddress.toLowerCase() !== currentUserAddress?.toLowerCase()) {
            // Send World App notification
            try {
              await supabase.functions.invoke('send-world-notification', {
                body: {
                  walletAddress: currentUserAddress,
                  senderAddress: message.senderAddress,
                  message: message.content,
                },
              });
              console.log('[XMTP] Notification sent for new message');
            } catch (error) {
              console.error('[XMTP] Failed to send notification:', error);
            }

            // Refresh conversations to show new message
            const allConversations = await client.conversations.list();
            const conversationsWithMessages = await Promise.all(
              allConversations.map(conv => loadConversationMessages(conv, conv.peerAddress))
            );
            conversationsWithMessages.sort((a, b) => 
              b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
            );
            setConversations(conversationsWithMessages);
          }
        }
      } catch (error) {
        console.error('[XMTP] Error setting up message stream:', error);
      }
    };

    setupMessageStream();

    return () => {
      if (streamCleanup) {
        streamCleanup();
      }
    };
  }, [client, isProfileOwner, currentUserAddress]);

  const initializeXMTP = async () => {
    if (!currentUserAddress) return;

    try {
      setIsInitializing(true);
      
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        const signer = provider.getSigner();
        
        const xmtpClient = await Client.create(signer, { env: 'production' });
        setClient(xmtpClient);

        // Load conversations if profile owner
        if (isProfileOwner) {
          setLoadingMessages(true);
          const allConversations = await xmtpClient.conversations.list();
          
          // Load messages for each conversation
          const conversationsWithMessages = await Promise.all(
            allConversations.map(conv => loadConversationMessages(conv, conv.peerAddress))
          );
          
          // Sort by last message time
          conversationsWithMessages.sort((a, b) => 
            b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
          );
          
          setConversations(conversationsWithMessages);
          setLoadingMessages(false);
        }

        toast({
          title: "Connected to XMTP",
          description: "You can now send and receive messages",
        });
      } else {
        toast({
          title: "Wallet not found",
          description: "Please install MetaMask or another Web3 wallet",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error initializing XMTP:", error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to XMTP",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!client || !message.trim()) return;

    const targetAddress = recipientAddress || activeConversation || profileAddress;
    if (!targetAddress) {
      toast({
        title: "No recipient",
        description: "Please select a conversation or enter an address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      let resolvedAddress = targetAddress;
      if (targetAddress.includes('.')) {
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        const resolved = await provider.resolveName(targetAddress);
        if (resolved) {
          resolvedAddress = resolved;
        }
      }

      const canMessage = await client.canMessage(resolvedAddress);
      if (!canMessage) {
        toast({
          title: "Recipient unavailable",
          description: "This wallet address hasn't enabled XMTP messaging yet",
          variant: "destructive",
        });
        return;
      }

      const conversation = await client.conversations.newConversation(resolvedAddress);
      await conversation.send(message);

      toast({
        title: "Message sent",
        description: `Your message was delivered`,
      });

      setMessage("");
      setRecipientAddress("");

      // Refresh conversations
      if (isProfileOwner) {
        setLoadingMessages(true);
        const allConversations = await client.conversations.list();
        const conversationsWithMessages = await Promise.all(
          allConversations.map(conv => loadConversationMessages(conv, conv.peerAddress))
        );
        conversationsWithMessages.sort((a, b) => 
          b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
        );
        setConversations(conversationsWithMessages);
        setActiveConversation(resolvedAddress);
        setLoadingMessages(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Send failed",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Not connected state - but still allow XMTP initialization
  if (!isConnected && !client) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Inbox className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-white">Inbox</h3>
        </div>
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 text-center">
          <Inbox className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
          <p className="text-foreground font-medium mb-2">Enable Messaging</p>
          <p className="text-muted-foreground text-sm mb-4">
            Connect to XMTP to send and receive messages
          </p>
          <Button
            onClick={() => {
              // Try to initialize XMTP - this will trigger wallet connection if needed
              initializeXMTP();
            }}
            className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
          >
            Connect to XMTP
          </Button>
        </Card>
      </div>
    );
  }
  
  // Not connected but has client - unlikely but handle gracefully
  if (!isConnected && client) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Inbox className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-white">Inbox</h3>
        </div>
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 text-center">
          <Wallet className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
          <p className="text-foreground font-medium mb-2">Connect Your Wallet</p>
          <p className="text-muted-foreground text-sm">
            Connect your wallet to send and receive messages
          </p>
        </Card>
      </div>
    );
  }

  // Initializing XMTP
  if (isInitializing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Inbox className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-white">Inbox</h3>
        </div>
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 text-center">
          <Skeleton className="h-20 w-full mb-3" />
          <p className="text-muted-foreground text-sm">Connecting to XMTP...</p>
        </Card>
      </div>
    );
  }

  // Profile owner inbox view with conversation history
  if (isProfileOwner && client) {
    const activeConv = conversations.find(c => c.peerAddress === activeConversation);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Inbox className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-white">Inbox</h3>
        </div>
        
        <div className="flex gap-3 h-[500px]">
          {/* Conversations List */}
          <Card className="w-1/3 p-3 bg-card/50 backdrop-blur-sm border-border/50 overflow-y-auto">
            <h4 className="font-semibold text-foreground mb-3 text-sm">Conversations</h4>
            {loadingMessages ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.peerAddress}
                    onClick={() => setActiveConversation(conv.peerAddress)}
                    className={`w-full p-2 rounded-lg text-left transition-colors ${
                      activeConversation === conv.peerAddress
                        ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50'
                        : 'bg-background/30 hover:bg-background/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar className="w-8 h-8 border border-[#D4AF37]/30">
                        <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs">
                          {conv.peerAddress.slice(2, 4).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-foreground truncate">
                          {conv.peerAddress.slice(0, 6)}...{conv.peerAddress.slice(-4)}
                        </p>
                        {conv.messages.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.messages[conv.messages.length - 1].content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(conv.lastMessageTime, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Messages View */}
          <Card className="flex-1 p-4 bg-card/50 backdrop-blur-sm border-border/50 flex flex-col">
            {activeConv ? (
              <>
                {/* Conversation Header */}
                <div className="pb-3 border-b border-border/50 mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-10 h-10 border-2 border-[#D4AF37]/30">
                      <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37]">
                        {activeConv.peerAddress.slice(2, 4).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground font-mono text-sm">
                        {activeConv.peerAddress.slice(0, 8)}...{activeConv.peerAddress.slice(-6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activeConv.messages.length} messages
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                  {activeConv.messages.map((msg) => {
                    const isOwnMessage = msg.senderAddress.toLowerCase() === currentUserAddress?.toLowerCase();
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <Avatar className="w-8 h-8 border border-[#D4AF37]/30 flex-shrink-0">
                          <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs">
                            {msg.senderAddress.slice(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`rounded-lg px-3 py-2 ${
                              isOwnMessage
                                ? 'bg-[#D4AF37] text-black'
                                : 'bg-background/80 text-foreground'
                            }`}
                          >
                            <p className="text-sm break-words">{msg.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(msg.sent), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="bg-background/50 border-border/50"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !message.trim()}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Inbox className="w-16 h-16 text-[#D4AF37]/50 mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Start a Conversation</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter a wallet address or ENS/Namestone domain below
                </p>
                <div className="w-full max-w-md space-y-3">
                  <Input
                    placeholder="0x... or name.eth"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="bg-background/50 border-border/50"
                  />
                  <Input
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="bg-background/50 border-border/50"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !message.trim() || !recipientAddress}
                    className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Message
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Not initialized - show connect button
  if (!client) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Inbox className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-white">Inbox</h3>
        </div>
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 text-center">
          <Inbox className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
          <p className="text-foreground font-medium mb-4">Enable Messaging</p>
          <Button
            onClick={initializeXMTP}
            className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
          >
            Connect to XMTP
          </Button>
        </Card>
      </div>
    );
  }

  // Visitor message view (another wallet connected, not owner)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Inbox className="w-5 h-5 text-[#D4AF37]" />
        <h3 className="text-sm font-semibold text-white">Message</h3>
      </div>
      
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center mb-3">
            Send a message to{" "}
            <span className="font-mono text-foreground">
              {profileAddress?.slice(0, 6)}...{profileAddress?.slice(-4)}
            </span>
          </p>
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="bg-background/50 border-border/50"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !message.trim()}
            className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </div>
      </Card>
    </div>
  );
};
