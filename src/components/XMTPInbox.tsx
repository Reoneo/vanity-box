import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface XMTPInboxProps {
  profileAddress: string;
  currentUserAddress?: string;
  isProfileOwner: boolean;
}

export const XMTPInbox = ({ profileAddress, currentUserAddress, isProfileOwner }: XMTPInboxProps) => {
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      // XMTP integration requires wallet signer which needs to be properly connected
      toast.info("XMTP messaging requires wallet connection. Please connect your wallet first.");
    } catch (error) {
      console.error('XMTP initialization error:', error);
    } finally {
      setIsInitializing(false);
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
            This is your profile. XMTP messaging available soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
        <MessageCircle className="w-12 h-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">XMTP Messaging</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Decentralized messaging coming soon
        </p>
        <Button onClick={handleInitialize} disabled={isInitializing}>
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
};
