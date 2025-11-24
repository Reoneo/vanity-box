import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const [conversation, setConversation] = useState<any>(null);

  const handleConnect = async () => {
    try {
      if (!MiniKit.isInstalled()) {
        toast.error("Please open this app in World App to use messaging");
        return;
      }

      console.log('🔄 Connecting to XMTP via World Chain');
      const { address, signer } = await authenticateWithWorldChain();
      await initializeClient(signer, address);
      
      // Create or get conversation with profile owner
      if (client) {
        const conversations = await client.conversations.list();
        let conv = conversations.find((c: any) => 
          c.peerAddress?.toLowerCase() === profileAddress.toLowerCase()
        );
        
        setConversation(conv || null);
        
        // Load existing messages
        const msgs = await conv.messages();
        setMessages(msgs);
      }
    } catch (error: any) {
      console.error('❌ XMTP connection error:', error);
      toast.error(error.message || "Failed to connect to XMTP");
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversation) return;

    setIsSending(true);
    try {
      await conversation.send(messageText);
      setMessageText('');
      
      // Refresh messages
      const msgs = await conversation.messages();
      setMessages(msgs);
      
      toast.success('Message sent');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Stream new messages
  useEffect(() => {
    if (!conversation) return;

    const streamMessages = async () => {
      for await (const message of await conversation.streamMessages()) {
        setMessages(prev => [...prev, message]);
      }
    };

    streamMessages();
  }, [conversation]);

  if (!currentUserAddress) {
    return null;
  }

  if (isProfileOwner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
          <MessageCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            This is your profile. XMTP inbox coming soon.
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
                key={idx}
                className={`flex ${msg.senderAddress === currentUserAddress ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-xs ${
                    msg.senderAddress === currentUserAddress
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isSending}
          />
          <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim()} size="icon">
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
