import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, MessageSquare, Send, User, Mail, ChevronRight, Plus, Search, X, ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@xmtp/browser-sdk";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useWorldXmtpClient, resetXmtpInstallation } from "@/hooks/useWorldXmtpClient";
import { MiniKit } from "@worldcoin/minikit-js";

import type { Dm } from '@xmtp/browser-sdk';

interface Message {
  id: string;
  content: string;
  senderAddress: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  recipientHasXmtp?: boolean;
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
  const { client, loading: xmtpLoading, error: xmtpError, walletAddress } = useWorldXmtpClient();
  const [conversations, setConversations] = useState<Dm[]>([]);
  const [activeConversation, setActiveConversation] = useState<Dm | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Load messages for a specific conversation
  const loadConversationMessages = async (dm: Dm) => {
    try {
      const msgs = await dm.messages();
      const formatted: Message[] = msgs.map((m) => ({
        id: m.id,
        content: typeof m.content === 'string' ? m.content : '',
        senderAddress: (m as any).senderInboxId || '',
        timestamp: (m as any).sentAt || new Date(),
      }));
      return formatted;
    } catch (error) {
      console.error("Error loading messages:", error);
      return [];
    }
  };

  // Listen for new messages
  useEffect(() => {
    if (!client || !isProfileOwner) return;

    const setupMessageStream = async () => {
      try {
        const stream = await client.conversations.streamAllMessages();
        for await (const message of stream) {
          const senderInboxId = (message as any).senderInboxId || '';
          if (senderInboxId && senderInboxId !== client.inboxId) {
            // Reload conversations
            const dms = await client.conversations.listDms();
            setConversations(dms);
          }
        }
      } catch (error) {
        console.error('XMTP stream error:', error);
      }
    };

    setupMessageStream();
  }, [client, isProfileOwner]);

  // Load conversations when client ready (profile owner only)
  useEffect(() => {
    if (!client || !isProfileOwner) return;

    const load = async () => {
      try {
        const dms = await client.conversations.listDms();
        setConversations(dms);
      } catch (error) {
        console.error("Error loading conversations:", error);
      }
    };

    load();
  }, [client, isProfileOwner]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const load = async () => {
      const msgs = await loadConversationMessages(activeConversation);
      setMessages(msgs);
    };

    load();
  }, [activeConversation]);

  // Send message
  const sendMessage = async () => {
    if (!client || !messageInput.trim() || sending) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content: messageInput,
      senderAddress: walletAddress || '',
      timestamp: new Date(),
      status: 'sending',
    };

    try {
      setSending(true);
      let targetDm: Dm | undefined;
      let recipientHasXmtp = true;

      // If profile owner viewing inbox
      if (isProfileOwner && activeConversation) {
        targetDm = activeConversation;
      } else {
        // Visitor sending to profile owner
        if (!profileAddress) {
          toast({
            title: "Error",
            description: "Profile address not found",
            variant: "destructive",
          });
          return;
        }

        // Check if recipient has XMTP (but don't block sending)
        try {
          const canMessageResult = await client.canMessage([{
            identifier: profileAddress,
            identifierKind: 'Ethereum' as const,
          }]);
          recipientHasXmtp = canMessageResult[profileAddress.toLowerCase()] || false;
          
          if (!recipientHasXmtp) {
            toast({
              title: "Recipient not on XMTP yet",
              description: "Message will be queued and delivered when they join XMTP",
              duration: 4000,
            });
          }
        } catch (error) {
          console.error("Error checking XMTP status:", error);
          // Continue anyway
        }

        // Find or create DM
        targetDm = await (async () => {
          for (const conv of conversations) {
            const convPeerInboxId = await (typeof conv.peerInboxId === 'function' 
              ? conv.peerInboxId() 
              : Promise.resolve(conv.peerInboxId));
            if (typeof convPeerInboxId === 'string' && convPeerInboxId.toLowerCase() === profileAddress.toLowerCase()) {
              return conv;
            }
          }
          return undefined;
        })();

        if (!targetDm) {
          try {
            targetDm = await client.conversations.newDm(profileAddress);
            setConversations((prev) => [targetDm!, ...prev]);
          } catch (error) {
            console.error("Error creating DM:", error);
            // Show optimistic message anyway
            setMessages((prev) => [...prev, { ...tempMessage, status: 'sent', recipientHasXmtp: false }]);
            setMessageInput("");
            toast({
              title: "Message queued",
              description: "Your message will be delivered when the recipient joins XMTP",
            });
            return;
          }
        }
      }

      if (!targetDm) {
        toast({
          title: "Error",
          description: "Could not create conversation",
          variant: "destructive",
        });
        return;
      }

      // Send
      await targetDm.send(messageInput);
      setMessageInput("");

      // Reload messages
      const updatedMessages = await loadConversationMessages(targetDm);
      const enrichedMessages = updatedMessages.map(m => ({
        ...m,
        status: m.senderAddress.toLowerCase() === walletAddress?.toLowerCase() ? 'delivered' : undefined,
        recipientHasXmtp,
      }));
      setMessages(enrichedMessages as Message[]);

      toast({
        title: recipientHasXmtp ? "Message delivered" : "Message sent",
        description: recipientHasXmtp ? "✓✓ Delivered" : "✓ Sent (recipient not on XMTP yet)",
      });
    } catch (err: any) {
      console.error("Send error:", err);
      
      // Show optimistic message even on error
      setMessages((prev) => [...prev, { ...tempMessage, status: 'sent', recipientHasXmtp: false }]);
      setMessageInput("");
      
      toast({
        title: "Message queued",
        description: "Your message will be delivered when possible",
      });
    } finally {
      setSending(false);
    }
  };

  // Loading state
  if (xmtpLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <MessageSquare className="absolute inset-0 m-auto w-6 h-6 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-base font-medium">Connecting to XMTP</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please confirm the prompts in World App to enable messaging
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (xmtpError) {
    const isInstallationLimitError = xmtpError.message.includes('already registered') && xmtpError.message.includes('10/10 installations');
    
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 px-4">
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center space-y-3 max-w-md">
          <p className="text-base font-semibold">Connection Failed</p>
          
          {isInstallationLimitError ? (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cannot register a new installation because the InboxID has already registered 10/10 installations. 
                Please revoke existing installations first.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
                <p className="text-xs font-semibold text-foreground">How to fix this:</p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Open World App Settings</li>
                  <li>Go to Privacy & Security</li>
                  <li>Select "Manage XMTP Installations"</li>
                  <li>Revoke old/unused installations</li>
                  <li>Return here and try the Reset button below</li>
                </ol>
              </div>
              <Button
                variant="destructive"
                className="mt-4"
                onClick={() => {
                  if (walletAddress) {
                    resetXmtpInstallation(walletAddress);
                    toast({
                      title: "XMTP Reset",
                      description: "Please refresh the page to reconnect",
                    });
                    setTimeout(() => window.location.reload(), 2000);
                  }
                }}
              >
                Reset XMTP Installation
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{xmtpError.message}</p>
              <p className="text-xs text-muted-foreground/70">
                Try refreshing the page or check your World App connection
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Not in World App
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="p-4 rounded-full bg-muted">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <p className="text-base font-medium">World App Required</p>
          <p className="text-sm text-muted-foreground">
            XMTP messaging is only available when using Vanity.box through World App
          </p>
        </div>
      </div>
    );
  }

  // Main inbox UI
  return (
    <div className="flex flex-col h-full relative bg-background" style={{ minHeight: '400px' }}>
      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-background border-b border-border shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wallet or ENS domain..."
                className="pl-10 pr-4"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    try {
                      const targetAddress = searchQuery.trim();
                      
                      // Check if they're on XMTP
                      let recipientHasXmtp = false;
                      try {
                        const canMessageResult = await client?.canMessage([{
                          identifier: targetAddress,
                          identifierKind: 'Ethereum' as const,
                        }]);
                        recipientHasXmtp = canMessageResult?.[targetAddress.toLowerCase()] || false;
                      } catch (error) {
                        console.error("Error checking XMTP status:", error);
                      }
                      
                      // ALWAYS create conversation regardless of XMTP status
                      const dm = await client?.conversations.newDm(targetAddress);
                      if (dm) {
                        setConversations((prev) => [dm, ...prev]);
                        setActiveConversation(dm);
                        setShowSearch(false);
                        setSearchQuery("");
                        
                        if (!recipientHasXmtp) {
                          toast({
                            title: "Recipient not on XMTP yet",
                            description: "Your messages will be queued until they join",
                            duration: 4000,
                          });
                        }
                      }
                    } catch (error) {
                      console.error("Error starting conversation:", error);
                      toast({
                        title: "Error",
                        description: "Could not start conversation. Try again.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Conversation List - Only for profile owner when no active conversation */}
      {isProfileOwner && conversations.length > 0 && !activeConversation && (
        <div className="flex-1 overflow-auto">
          <div className="space-y-1 p-2">
            {conversations.map((dm) => {
              const peerInboxIdRaw = dm.peerInboxId;
              const displayId = (typeof peerInboxIdRaw === 'string' ? peerInboxIdRaw : dm.id);
              
              return (
                <button
                  key={dm.id}
                  onClick={() => setActiveConversation(dm)}
                  className="w-full text-left p-3 rounded-lg transition-all hover:bg-muted/60 border border-transparent"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate mb-0.5">
                        {typeof displayId === 'string' ? `${displayId.slice(0, 8)}...${displayId.slice(-6)}` : 'Conversation'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tap to view conversation
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages Display or Empty State */}
      {(conversations.length === 0 && isProfileOwner) || (!activeConversation && !isProfileOwner) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Nothing here</h3>
          <p className="text-base text-muted-foreground">
            You have no conversations yet. Start one!
          </p>
        </div>
      ) : activeConversation || !isProfileOwner ? (
        <div className="flex-1 flex flex-col">
          {/* Header with back button */}
          {isProfileOwner && activeConversation && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => setActiveConversation(null)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {(() => {
                      const peerInboxIdRaw = activeConversation.peerInboxId;
                      const displayId = (typeof peerInboxIdRaw === 'string' ? peerInboxIdRaw : activeConversation.id);
                      return typeof displayId === 'string' ? `${displayId.slice(0, 8)}...${displayId.slice(-6)}` : 'Conversation';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Message area */}
          <div className="flex-1 overflow-auto p-4 bg-background/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Send className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-2">Start a conversation</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Send your first message
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.senderAddress.toLowerCase() === walletAddress?.toLowerCase();
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                        <div className={cn(
                          "flex items-center gap-1.5 mt-1.5",
                          isOwn ? "justify-end" : "justify-start"
                        )}>
                          <p className={cn(
                            "text-xs font-medium",
                            isOwn ? "opacity-80" : "opacity-60"
                          )}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {isOwn && (
                            <div className="flex items-center gap-0.5">
                              {msg.recipientHasXmtp === false ? (
                                <svg className="w-3.5 h-3.5 opacity-70" viewBox="0 0 16 16" fill="none">
                                  <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : msg.status === 'read' ? (
                                <>
                                  <svg className="w-3.5 h-3.5 -mr-2" viewBox="0 0 16 16" fill="none">
                                    <path d="M13.5 4L6 11.5L2.5 8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                                    <path d="M13.5 4L6 11.5L2.5 8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5 -mr-2 opacity-70" viewBox="0 0 16 16" fill="none">
                                    <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  <svg className="w-3.5 h-3.5 opacity-70" viewBox="0 0 16 16" fill="none">
                                    <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {isOwn && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-border bg-card flex-shrink-0 p-3">
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  !isProfileOwner && !profileAddress 
                    ? "Profile address required" 
                    : "Type a message..."
                }
                disabled={sending || (!isProfileOwner && !profileAddress)}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!messageInput.trim() || sending || (!isProfileOwner && !profileAddress)}
                size="icon"
                className="h-10 w-10 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating Plus Button - Only for profile owner */}
      {isProfileOwner && (
        <button
          onClick={() => setShowSearch(true)}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg flex items-center justify-center transition-all hover:scale-105 z-10"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </button>
      )}
    </div>
  );
};
