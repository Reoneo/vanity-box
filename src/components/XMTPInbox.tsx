import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Inbox, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@xmtp/xmtp-js";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
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
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isConnected = !!currentUserAddress;
  const canMessage = isConnected && profileAddress;

  const initializeXMTP = async () => {
    if (!currentUserAddress) return;

    try {
      setIsInitializing(true);
      
      // Request wallet connection via browser wallet (MetaMask, etc.)
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        const signer = provider.getSigner();
        
        // Create XMTP client
        const xmtpClient = await Client.create(signer, { env: 'production' });
        setClient(xmtpClient);

        // Load conversations if profile owner
        if (isProfileOwner) {
          const allConversations = await xmtpClient.conversations.list();
          setConversations(allConversations);
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

    const targetAddress = recipientAddress || profileAddress;
    if (!targetAddress) {
      toast({
        title: "No recipient",
        description: "Please enter a wallet address or ENS name",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Resolve ENS if needed
      let resolvedAddress = targetAddress;
      if (targetAddress.includes('.')) {
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        const resolved = await provider.resolveName(targetAddress);
        if (resolved) {
          resolvedAddress = resolved;
        }
      }

      // Check if recipient can receive XMTP messages
      const canMessage = await client.canMessage(resolvedAddress);
      if (!canMessage) {
        toast({
          title: "Recipient unavailable",
          description: "This wallet address hasn't enabled XMTP messaging yet",
          variant: "destructive",
        });
        return;
      }

      // Create conversation and send message
      const conversation = await client.conversations.newConversation(resolvedAddress);
      await conversation.send(message);

      toast({
        title: "Message sent",
        description: `Your message was delivered to ${targetAddress}`,
      });

      setMessage("");
      setRecipientAddress("");

      // Refresh conversations if owner
      if (isProfileOwner) {
        const allConversations = await client.conversations.list();
        setConversations(allConversations);
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

  // Not connected state
  if (!isConnected) {
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

  // Profile owner inbox view
  if (isProfileOwner && client) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Inbox className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-white">Inbox</h3>
        </div>
        
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Start a Conversation</h4>
            <Input
              placeholder="Enter wallet address or ENS/Namestone domain"
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
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>

          {conversations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <h4 className="font-semibold text-foreground mb-3">Recent Conversations</h4>
              <div className="space-y-2">
                {conversations.slice(0, 3).map((conv, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground font-mono">
                      {conv.peerAddress.slice(0, 6)}...{conv.peerAddress.slice(-4)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
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
