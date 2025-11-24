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
  const [canMessage, setCanMessage] = useState(true);
  const [conversation, setConversation] = useState<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleConnect = async () => {
    try {
      if (!MiniKit.isInstalled()) {
        console.error('❌ MiniKit not installed');
        toast.error('Please open in World App');
        return;
      }

      console.log('🔄 Connecting to XMTP via World Chain');
      const { address, signer } = await authenticateWithWorldChain();
      await initializeClient(signer, address);
      console.log('✅ Connected to XMTP');
    } catch (error: any) {
      console.error('❌ XMTP connection error:', error);
      toast.error('Failed to connect to messaging');
    }
  };

  // Initialize conversation once client is ready
  useEffect(() => {
    if (!client || !isConnected || !profileAddress || isLoadingConversation) return;

    const initConversation = async () => {
      setIsLoadingConversation(true);
      try {
        console.log('🔄 Checking if can message:', profileAddress);
        
        // Check if the profile address can receive messages
        const canMsg = await client.canMessage([{
          identifier: profileAddress.toLowerCase(),
          identifierKind: 'Ethereum'
        }]);
        const canReceive = canMsg[profileAddress.toLowerCase()];
        
        if (!canReceive) {
          console.warn('⚠️ Target address cannot receive XMTP messages');
          setCanMessage(false);
          setIsLoadingConversation(false);
          return;
        }
        
        setCanMessage(true);
        console.log('✅ Target can receive messages');
        
        // Sync conversations first to get latest state
        await client.conversations.sync();
        
        // Get all DMs and find one with matching peer address
        const allDms = await client.conversations.listDms();
        let dm = allDms.find((d: any) => 
          d.peerAddress?.toLowerCase() === profileAddress.toLowerCase()
        );
        
        // If no DM exists, create one using the correct SDK v5 API
        if (!dm) {
          console.log('📝 Creating new DM with:', profileAddress);
          dm = await client.conversations.newDm(profileAddress.toLowerCase());
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
        toast.error('Failed to load conversation');
      } finally {
        setIsLoadingConversation(false);
      }
    };

    initConversation();
  }, [client, isConnected, profileAddress]);

  // Stream new messages using correct SDK v5 API
  useEffect(() => {
    if (!conversation) return;

    let isActive = true;
    const startStreaming = async () => {
      try {
        console.log('👂 Starting to stream messages');
        
        // Use the correct SDK v5 streaming API
        for await (const message of await conversation.stream()) {
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
      console.log('📤 Conversation object:', {
        id: conversation.id,
        peerAddress: conversation.peerAddress,
        dmPeerInboxId: conversation.dmPeerInboxId,
        hasSendMethod: typeof conversation.send === 'function'
      });
      
      await conversation.send(textToSend);
      console.log('✅ Message sent successfully');
      toast.success('Message sent!');
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        conversationId: conversation?.id
      });
      toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
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

  if (!canMessage) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
          <MessageCircle className="w-12 h-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Cannot Send Message</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            This user hasn't enabled XMTP messaging yet
          </p>
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

        {/* Composer - always enabled for mobile keyboard */}
        <div className="flex gap-2 pt-2 border-t">
          <textarea
            ref={inputRef}
            className="flex-1 resize-none text-sm bg-background border rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
            rows={2}
            placeholder={
              !conversation
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
            style={{ WebkitUserSelect: 'text', fontSize: '16px' }}
          />
          <Button
            size="icon"
            className="shrink-0"
            disabled={
              !conversation ||
              isSending ||
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