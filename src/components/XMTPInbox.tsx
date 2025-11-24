import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useXmtp } from "@/contexts/XmtpContext";
import { authenticateWithWorldChain } from "@/lib/worldChainAuth";
import { MiniKit } from "@worldcoin/minikit-js";

interface XMTPInboxProps {
  profileAddress: string;
  currentUserAddress?: string;
  isProfileOwner: boolean;
}

export const XMTPInbox = ({ profileAddress, currentUserAddress, isProfileOwner }: XMTPInboxProps) => {
  const { client, isInitializing, isConnected, initializeClient } = useXmtp();
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleConnect = async () => {
    try {
      if (!MiniKit.isInstalled()) {
        console.error('❌ MiniKit not installed');
        return;
      }

      console.log('🔄 Connecting to XMTP via World Chain');
      const { address, signer } = await authenticateWithWorldChain();
      await initializeClient(signer, address);
      console.log('✅ Connected to XMTP');
    } catch (error: any) {
      console.error('❌ XMTP connection error:', error);
    }
  };

  // Initialize conversation once client is ready
  useEffect(() => {
    if (!client || !isConnected || !profileAddress || isLoadingConversation) return;

    const initConversation = async () => {
      setIsLoadingConversation(true);
      try {
        console.log('🔄 Finding or creating DM conversation with:', profileAddress);
        
        // Sync conversations first to get latest state
        await client.conversations.sync();
        
        // Get all DMs and find one with matching peer address
        const allDms = await client.conversations.listDms();
        let dm = allDms.find((d: any) => 
          d.peerAddress?.toLowerCase() === profileAddress.toLowerCase()
        );
        
        // If no DM exists, create one
        if (!dm) {
          console.log('📝 Creating new DM with:', profileAddress);
          dm = await client.conversations.newDm(profileAddress);
          console.log('✅ New DM created');
        } else {
          console.log('✅ Found existing DM');
        }
        
        setConversation(dm);
        
        // Sync and load messages for this conversation
        await dm.sync();
        const existingMessages = await dm.messages();
        setMessages(existingMessages);
        console.log(`📬 Loaded ${existingMessages.length} messages`);
        
        // Scroll to bottom
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (error: any) {
        console.error('❌ Failed to initialize conversation:', error);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    initConversation();
  }, [client, isConnected, profileAddress]);

  // Stream new messages
  useEffect(() => {
    if (!conversation) return;

    let isActive = true;
    const startStreaming = async () => {
      try {
        console.log('👂 Starting to stream messages');
        const stream = conversation.streamMessages();
        
        for await (const message of stream) {
          if (!isActive) break;
          console.log('📨 New message received:', message.id);
          setMessages(prev => {
            // Prevent duplicates
            if (prev.find(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      } catch (error) {
        console.error('❌ Error streaming messages:', error);
      }
    };

    startStreaming();

    return () => {
      isActive = false;
    };
  }, [conversation]);

  // Auto-focus input when conversation is loaded
  useEffect(() => {
    if (conversation && inputRef.current) {
      // Single reliable focus after render completes
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversation || isSending) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      console.log('📤 Sending message:', textToSend);
      console.log('📤 Conversation:', conversation.id);
      await conversation.send(textToSend);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setMessageText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  if (!currentUserAddress) {
    return null;
  }

  if (isProfileOwner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
          <MessageCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            This is your profile. View your inbox in the messaging tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
          <MessageCircle className="w-12 h-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Send a Message</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Connect your World Chain wallet to send encrypted messages
          </p>
          <Button onClick={handleConnect} disabled={isInitializing}>
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect to XMTP"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingConversation) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Messages</h3>
        </div>
        
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex ${msg.senderInboxId === client?.inboxId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-xs ${
                    msg.senderInboxId === client?.inboxId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="flex gap-2 pt-2 border-t z-10 pointer-events-auto">
          <textarea
            ref={inputRef}
            className="flex-1 resize-none text-xs bg-background border rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={1}
            placeholder={
              !client
                ? 'Connect chat via World App to send messages'
                : !conversation
                ? 'Loading conversation…'
                : 'Type a message…'
            }
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            // No disabled prop - always allow typing for mobile keyboard
          />
          <Button
            size="icon"
            className="shrink-0"
            disabled={
              !client ||
              !conversation ||
              isSending ||
              isLoadingConversation ||
              !!loadError ||
              !messageText.trim()
            }
            onClick={handleSendMessage}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
