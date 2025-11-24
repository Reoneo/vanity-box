import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
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
    toast.info("XMTP messaging is temporarily disabled for troubleshooting");
    setIsInitializing(false);
  };

  if (!currentUserAddress) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <MessageCircle className="w-12 h-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">XMTP Messaging</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Temporarily disabled for troubleshooting
        </p>
        <Button onClick={handleInitialize} disabled={isInitializing}>
          {isInitializing ? "Connecting..." : "Connect to XMTP"}
        </Button>
      </div>
    </Card>
  );
};
