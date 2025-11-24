import React, { useState, useEffect, useRef } from 'react';
import { usePush } from '@/contexts/PushContext';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { CONSTANTS } from '@pushprotocol/restapi';

interface PushInboxProps {
  profileAddress: string;
  currentUserAddress?: string;
  isProfileOwner: boolean;
}

export const PushInbox = ({ profileAddress, currentUserAddress, isProfileOwner }: PushInboxProps) => {
  const { pushUser, isInitializing, isConnected, initializePush, walletAddress } = usePush();
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [canMessage, setCanMessage] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConnect = async () => {
    try {
      await initializePush();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  // Initialize conversation and load messages
  useEffect(() => {
    if (!pushUser || !profileAddress) return;

    const initConversation = async () => {
      setIsLoadingConversation(true);
      console.log('🔄 Initializing conversation with:', profileAddress);

      try {
        // Load message history
        console.log('📥 Loading message history...');
        const history = await pushUser.chat.history(profileAddress.toLowerCase());
        
        console.log(`✅ Loaded ${history.length} messages`);
        setMessages(history.reverse()); // Reverse to show oldest first
        setCanMessage(true);
      } catch (error: any) {
        console.error('❌ Failed to load conversation:', error);
        toast.error('Failed to load messages');
        setCanMessage(false);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    initConversation();
  }, [pushUser, profileAddress]);

  // Stream new messages
  useEffect(() => {
    if (!pushUser) return;

    let stream: any;
    const setupStream = async () => {
      try {
        console.log('🎧 Setting up message stream...');
        stream = await pushUser.initStream([CONSTANTS.STREAM.CHAT]);

        stream.on(CONSTANTS.STREAM.CHAT, (message: any) => {
          console.log('📨 New message received:', message);
          
          // Only add messages from current conversation
          if (message.from?.toLowerCase() === profileAddress.toLowerCase() ||
              message.to?.find((addr: string) => addr.toLowerCase() === profileAddress.toLowerCase())) {
            setMessages(prev => [...prev, message]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        });

        await stream.connect();
        console.log('✅ Message stream connected');
      } catch (error) {
        console.error('❌ Failed to setup message stream:', error);
      }
    };

    setupStream();

    return () => {
      if (stream) {
        stream.disconnect();
        console.log('🔌 Message stream disconnected');
      }
    };
  }, [pushUser, profileAddress]);

  // Auto-focus input
  useEffect(() => {
    if (isConnected && !isLoadingConversation) {
      inputRef.current?.focus();
    }
  }, [isConnected, isLoadingConversation]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !pushUser || !profileAddress) return;

    setIsSending(true);
    const textToSend = messageText.trim();
    console.log('📤 Sending message:', textToSend);

    try {
      await pushUser.chat.send(profileAddress.toLowerCase(), {
        content: textToSend,
        type: 'Text'
      });

      console.log('✅ Message sent successfully');
      setMessageText('');
      toast.success('Message sent');
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (!currentUserAddress) {
    return null;
  }

  if (isProfileOwner) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>This is your profile. To view your inbox, visit the messaging page.</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Send a Message</h3>
          <p className="text-sm text-muted-foreground">
            Connect to Push Protocol to send encrypted messages
          </p>
        </div>
        <Button 
          onClick={handleConnect} 
          disabled={isInitializing}
          className="w-full"
        >
          {isInitializing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect to Push Protocol'
          )}
        </Button>
      </div>
    );
  }

  if (isLoadingConversation) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (canMessage === false) {
    return (
      <div className="p-6 text-center space-y-2">
        <p className="text-muted-foreground">Cannot send messages to this user</p>
        <p className="text-sm text-muted-foreground">
          They may not have enabled Push Protocol messaging yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg, idx) => {
            // Compare sender address with our wallet address
            const isOurMessage = msg.fromDID?.toLowerCase().includes(walletAddress?.toLowerCase() || '');
            return (
              <div
                key={msg.cid || idx}
                className={`flex ${isOurMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-xs ${
                    isOurMessage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm break-words">{msg.messageContent || msg.messageObj?.content}</p>
                  {msg.timestamp && (
                    <p className="text-[10px] opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric'
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

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ 
              WebkitUserSelect: 'text',
              fontSize: '16px',
              touchAction: 'manipulation'
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
