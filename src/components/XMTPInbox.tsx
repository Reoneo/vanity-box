import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageCircle, ArrowLeft } from "lucide-react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useXmtpClient } from "@/contexts/XmtpProvider";
import { toast } from "sonner";

interface XMTPInboxProps {
  profileAddress: string;
  currentUserAddress?: string;
  isProfileOwner: boolean;
}

const createWorldAppSigner = (address: string) => ({
  type: 'EOA' as const,
  getIdentifier: async () => ({
    identifier: address.toLowerCase(),
    identifierKind: 'Ethereum' as const,
  }),
  signMessage: async (message: string): Promise<Uint8Array> => {
    console.log("[XMTP] Requesting signature from World App");
    const { finalPayload } = await MiniKit.commandsAsync.signMessage({ message });
    
    if (!finalPayload || finalPayload.status === 'error') {
      throw new Error("No signature received from World App");
    }

    // Convert hex signature to Uint8Array
    const hexString = finalPayload.signature.replace('0x', '');
    const bytes = new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    console.log("[XMTP] Signature received and converted");
    return bytes;
  },
});

export const XMTPInbox = ({ profileAddress, currentUserAddress, isProfileOwner }: XMTPInboxProps) => {
  const { client, setClient } = useXmtpClient();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pre-fill recipient if viewing someone else's profile
  useEffect(() => {
    if (!isProfileOwner && profileAddress) {
      setNewRecipient(profileAddress);
      setShowNewConversation(true);
    }
  }, [profileAddress, isProfileOwner]);

  // Load conversations when client is ready
  useEffect(() => {
    if (client) {
      loadConversations();
    }
  }, [client]);

  // Stream messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !client) return;

    const setupMessageStream = async () => {
      try {
        console.log("[XMTP] Setting up message stream for conversation");
        
        // Clean up previous stream
        if (streamCleanupRef.current) {
          streamCleanupRef.current();
        }

        // Stream new messages
        const stream = selectedConversation.streamMessages();
        
        const processStream = async () => {
          for await (const message of stream) {
            console.log("[XMTP] New message received via stream:", message);
            setMessages(prev => [...prev, {
              id: message.id,
              content: message.content,
              senderAddress: message.senderInboxId,
              sentAt: message.sentAt,
            }]);
          }
        };

        processStream().catch(console.error);

        streamCleanupRef.current = () => {
          console.log("[XMTP] Cleaning up message stream");
          // Browser SDK streams are async iterators, they clean up automatically when broken
        };
      } catch (error) {
        console.error("[XMTP] Error setting up message stream:", error);
      }
    };

    setupMessageStream();

    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
    };
  }, [selectedConversation, client]);

  const loadConversations = async () => {
    if (!client) return;
    
    try {
      setIsLoading(true);
      console.log("[XMTP] Loading conversations");
      const convos = await client.conversations.list();
      console.log("[XMTP] Loaded conversations:", convos.length);
      setConversations(convos);
    } catch (error) {
      console.error("[XMTP] Error loading conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversation: any) => {
    try {
      setIsLoadingMessages(true);
      console.log("[XMTP] Loading messages for conversation");
      const msgs = await conversation.messages();
      console.log("[XMTP] Loaded messages:", msgs.length);
      
      const formattedMessages = msgs.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderAddress: msg.senderInboxId,
        sentAt: msg.sentAt,
      }));
      
      setMessages(formattedMessages);
      setSelectedConversation(conversation);
    } catch (error) {
      console.error("[XMTP] Error loading messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !client) return;

    try {
      setIsSending(true);

      if (selectedConversation) {
        // Send to existing conversation
        console.log("[XMTP] Sending message to existing conversation");
        await selectedConversation.send(newMessage);
        console.log("[XMTP] Message sent successfully");
        
        // Add message to local state immediately for better UX
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: newMessage,
          senderAddress: client.inboxId,
          sentAt: new Date(),
        }]);
      } else if (newRecipient.trim()) {
        // Start new conversation
        console.log("[XMTP] Starting new DM with:", newRecipient);
        const dm = await client.conversations.newDm(newRecipient.toLowerCase());
        await dm.send(newMessage);
        console.log("[XMTP] New DM created and message sent");
        
        setSelectedConversation(dm);
        setMessages([{
          id: Date.now().toString(),
          content: newMessage,
          senderAddress: client.inboxId,
          sentAt: new Date(),
        }]);
        setShowNewConversation(false);
        
        // Reload conversations to show the new one
        await loadConversations();
      }

      setNewMessage("");
      toast.success("Message sent!");
    } catch (error) {
      console.error("[XMTP] Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleInitialize = async () => {
    if (!currentUserAddress) {
      toast.error("Please connect your World App wallet first");
      return;
    }

    try {
      setIsLoading(true);
      console.log("[XMTP] Initializing XMTP client for address:", currentUserAddress);

      // Dynamically import XMTP SDK to ensure Buffer polyfill is ready
      console.log("[XMTP] Dynamically importing XMTP Browser SDK");
      const { Client } = await import("@xmtp/browser-sdk");
      console.log("[XMTP] XMTP Browser SDK loaded successfully");

      // Authenticate with World App
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: Math.random().toString(36).substring(7),
        requestId: Math.random().toString(36).substring(7),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(),
        statement: "Sign in to use XMTP messaging",
      });

      if (!finalPayload || finalPayload.status === 'error') {
        throw new Error("World App authentication failed");
      }

      console.log("[XMTP] World App authenticated, creating XMTP client");

      // Create XMTP client with World App signer
      const signer = createWorldAppSigner(currentUserAddress);
      const xmtpClient = await Client.create(signer, {
        env: 'production',
      });

      console.log("[XMTP] Client created successfully, inbox ID:", xmtpClient.inboxId);
      setClient(xmtpClient);
      toast.success("Connected to XMTP!");
      
      // Load conversations after successful connection
      const convos = await xmtpClient.conversations.list();
      setConversations(convos);
    } catch (error) {
      console.error("[XMTP] Initialization error:", error);
      toast.error("Failed to connect to XMTP");
    } finally {
      setIsLoading(false);
    }
  };

  if (!client) {
    return (
      <Card className="p-8 text-center space-y-4">
        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold mb-2">XMTP Messaging</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect to start secure, decentralized messaging
          </p>
        </div>
        <Button onClick={handleInitialize} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect to XMTP"
          )}
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Conversations List */}
      <Card className="md:col-span-1 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Messages</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowNewConversation(true);
              setSelectedConversation(null);
              setMessages([]);
            }}
          >
            New
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversations yet
            </p>
          ) : (
            <div className="space-y-2">
              {conversations.map((convo) => (
                <Button
                  key={convo.id}
                  variant={selectedConversation?.id === convo.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left"
                  onClick={() => loadMessages(convo)}
                >
                  <div className="truncate">
                    <div className="font-medium text-sm truncate">
                      {convo.peerInboxId?.substring(0, 8)}...
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Messages Area */}
      <Card className="md:col-span-2 p-4 flex flex-col">
        {showNewConversation ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewConversation(false)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold">New Conversation</h3>
            </div>
            <Input
              placeholder="Enter recipient address (0x...)"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
            />
          </div>
        ) : selectedConversation ? (
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedConversation(null);
                setMessages([]);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-sm text-muted-foreground">
              {selectedConversation.peerInboxId?.substring(0, 12)}...
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation or start a new one
          </div>
        )}

        {(selectedConversation || showNewConversation) && (
          <>
            <ScrollArea className="flex-1 mb-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.senderAddress === client?.inboxId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm break-words">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.sentAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isSending && handleSendMessage()}
                disabled={isSending}
              />
              <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
