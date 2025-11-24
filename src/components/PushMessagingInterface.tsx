import React, { useState, useEffect, useRef } from 'react';
import { usePush } from '@/contexts/PushContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ArrowLeft, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { pushConversationManager } from '@/lib/pushConversationManager';
import { CONSTANTS } from '@pushprotocol/restapi';
import { createPublicClient, http, isAddress, getAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

interface Conversation {
  chatId: string;
  did: string;
  displayName: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount: number;
}

export const PushMessagingInterface = () => {
  const { pushUser, isInitializing, isConnected, initializePush, walletAddress } = usePush();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newChatAddress, setNewChatAddress] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resolve ENS/World Chain names to addresses
  const resolveAddressOrENS = async (input: string): Promise<string> => {
    const trimmed = input.trim().toLowerCase();
    
    // Check if it's already an Ethereum address
    if (isAddress(trimmed)) {
      return getAddress(trimmed);
    }

    // Try ENS
    if (trimmed.endsWith('.eth')) {
      try {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http()
        });
        
        const address = await publicClient.getEnsAddress({
          name: normalize(trimmed)
        });
        
        if (address) {
          return getAddress(address);
        }
      } catch (error) {
        console.error('ENS resolution failed:', error);
      }
    }

    // Try World Chain (.wld)
    if (trimmed.endsWith('.wld')) {
      try {
        const subdomain = trimmed.replace('.wld', '');
        const response = await fetch(
          `https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-namestone-records?subdomain=${subdomain}&domain=wld`,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.records?.eth) {
            return getAddress(data.records.eth);
          }
        }
      } catch (error) {
        console.error('World Chain resolution failed:', error);
      }
    }

    throw new Error('Invalid address or name could not be resolved');
  };

  const handleConnect = async () => {
    try {
      await initializePush();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  // Load conversations
  useEffect(() => {
    if (!pushUser) return;

    const loadConversations = async () => {
      setIsLoadingConversations(true);
      console.log('📥 Loading conversations...');

      try {
        const chats = await pushUser.chat.list('CHATS');
        console.log(`✅ Loaded ${chats.length} conversations`);

        const hiddenConversations = pushConversationManager.getHiddenConversations();
        
        const mappedConversations: Conversation[] = chats
          .filter(chat => !hiddenConversations.some(h => h.chatId === chat.chatId))
          .map(chat => ({
            chatId: chat.chatId,
            did: chat.did,
            displayName: chat.profilePicture || chat.did?.split(':')[1]?.substring(0, 8) || 'Unknown',
            lastMessage: chat.msg?.messageContent || '',
            timestamp: chat.msg?.timestamp ? new Date(chat.msg.timestamp).getTime() : Date.now(),
            unreadCount: 0
          }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        setConversations(mappedConversations);
      } catch (error) {
        console.error('❌ Failed to load conversations:', error);
        toast.error('Failed to load conversations');
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [pushUser]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!pushUser || !selectedConversation) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      console.log('📥 Loading messages for:', selectedConversation.did);

      try {
        const address = selectedConversation.did.split(':')[1];
        const history = await pushUser.chat.history(address);
        
        console.log(`✅ Loaded ${history.length} messages`);
        setMessages(history.reverse());
      } catch (error) {
        console.error('❌ Failed to load messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [pushUser, selectedConversation]);

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
          
          if (selectedConversation) {
            const address = selectedConversation.did.split(':')[1];
            if (message.from?.toLowerCase().includes(address.toLowerCase()) ||
                message.to?.some((addr: string) => addr.toLowerCase().includes(address.toLowerCase()))) {
              setMessages(prev => [...prev, message]);
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
          }

          // Update conversation list
          setConversations(prev => {
            const updated = [...prev];
            const index = updated.findIndex(c => 
              message.from?.toLowerCase().includes(c.did.split(':')[1]?.toLowerCase())
            );
            
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                lastMessage: message.messageContent || message.messageObj?.content,
                timestamp: message.timestamp ? new Date(message.timestamp).getTime() : Date.now(),
                unreadCount: selectedConversation?.chatId === updated[index].chatId ? 0 : updated[index].unreadCount + 1
              };
              
              // Move to top
              const [conversation] = updated.splice(index, 1);
              updated.unshift(conversation);
            }
            
            return updated;
          });
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
  }, [pushUser, selectedConversation]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !pushUser || !selectedConversation) return;

    setIsSending(true);
    const textToSend = messageText.trim();
    console.log('📤 Sending message:', textToSend);

    try {
      const address = selectedConversation.did.split(':')[1];
      await pushUser.chat.send(address, {
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

  const handleStartConversation = async () => {
    if (!newChatAddress.trim() || !pushUser) return;

    setIsStartingChat(true);
    console.log('🆕 Starting new conversation with:', newChatAddress);

    try {
      const resolvedAddress = await resolveAddressOrENS(newChatAddress);
      console.log('✅ Resolved to:', resolvedAddress);

      // Send initial message to create chat
      await pushUser.chat.send(resolvedAddress, {
        content: 'Hello!',
        type: 'Text'
      });

      setNewChatAddress('');
      toast.success('Conversation started');

      // Reload conversations
      const chats = await pushUser.chat.list('CHATS');
      const newChat = chats.find(c => c.did.toLowerCase().includes(resolvedAddress.toLowerCase()));
      
      if (newChat) {
        const conversation: Conversation = {
          chatId: newChat.chatId,
          did: newChat.did,
          displayName: newChat.profilePicture || resolvedAddress.substring(0, 8),
          lastMessage: 'Hello!',
          timestamp: Date.now(),
          unreadCount: 0
        };
        
        setConversations(prev => [conversation, ...prev]);
        setSelectedConversation(conversation);
      }
    } catch (error: any) {
      console.error('❌ Failed to start conversation:', error);
      toast.error(error.message || 'Failed to start conversation');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    pushConversationManager.hideConversation(conversation.chatId, conversation.did);
    setConversations(prev => prev.filter(c => c.chatId !== conversation.chatId));
    
    if (selectedConversation?.chatId === conversation.chatId) {
      setSelectedConversation(null);
      setMessages([]);
    }
    
    toast.success('Conversation hidden');
  };

  if (!isConnected) {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <h2 className="text-2xl font-bold">Push Protocol Messaging</h2>
          <p className="text-muted-foreground">
            Connect to Push Protocol to send encrypted messages
          </p>
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
      </div>
    );
  }

  const filteredConversations = conversations.filter(conv =>
    conv.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.did.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex">
      {/* Conversations Sidebar */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r`}>
        <div className="p-4 border-b space-y-3">
          <h2 className="text-xl font-bold">Messages</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* New Chat */}
          <div className="flex gap-2">
            <Input
              placeholder="Address or ENS/WLD name"
              value={newChatAddress}
              onChange={(e) => setNewChatAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStartConversation()}
            />
            <Button
              onClick={handleStartConversation}
              disabled={!newChatAddress.trim() || isStartingChat}
              size="icon"
            >
              {isStartingChat ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.chatId}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversation?.chatId === conv.chatId ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conv.displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                        {conv.unreadCount}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h3 className="font-semibold">{selectedConversation.displayName}</h3>
                <p className="text-xs text-muted-foreground truncate max-w-xs">
                  {selectedConversation.did}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No messages yet
                </p>
              ) : (
                messages.map((msg, idx) => {
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

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                  placeholder="Type a message..."
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
};
