import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Trash2, AlertTriangle, Info, CheckCircle, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useXmtp } from "@/contexts/XmtpContext";
import { xmtpConversationManager } from "@/lib/xmtpConversationManager";

export const XMTPSettings = () => {
  const { walletAddress, disconnectClient } = useXmtp();
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const getStoredInstallations = () => {
    const installations: { address: string; timestamp?: string }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('xmtp-keys-')) {
        const address = key.replace('xmtp-keys-', '');
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            installations.push({
              address,
              timestamp: parsed.timestamp || 'Unknown'
            });
          }
        } catch (e) {
          installations.push({ address });
        }
      }
    }
    
    return installations;
  };

  const [installations] = useState(getStoredInstallations());

  const clearInstallation = async (address?: string) => {
    setIsClearing(true);
    try {
      if (address) {
        // Clear specific installation
        const key = `xmtp-keys-${address}`;
        localStorage.removeItem(key);
        toast.success(`Cleared installation for ${address.slice(0, 6)}...${address.slice(-4)}`);
      } else {
        // Clear all XMTP installations
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('xmtp-keys-')) {
            keys.push(key);
          }
        }
        
        keys.forEach(key => localStorage.removeItem(key));
        toast.success(`Cleared ${keys.length} installation(s)`);
      }
      
      // Disconnect current client if clearing current wallet
      if (!address || address === walletAddress?.toLowerCase()) {
        disconnectClient();
      }
      
      // Close dialog and refresh
      setIsOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error clearing installation:', error);
      toast.error('Failed to clear installation');
    } finally {
      setIsClearing(false);
    }
  };

  const clearAllInstallations = () => {
    if (confirm('This will clear all XMTP installations and disconnect you. You will need to reconnect. Continue?')) {
      clearInstallation();
    }
  };

  const clearHiddenConversations = () => {
    const hiddenCount = xmtpConversationManager.getHiddenConversations().length;
    if (hiddenCount === 0) {
      toast.info('No hidden conversations to clear');
      return;
    }
    
    if (confirm(`Unhide ${hiddenCount} hidden conversation(s)? They will reappear in your conversation list.`)) {
      xmtpConversationManager.clearHiddenConversations();
      toast.success('Hidden conversations cleared');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">XMTP Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>XMTP Installation Management</DialogTitle>
          <DialogDescription>
            Manage your XMTP client installations and stored keys
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current Connection */}
          {walletAddress && (
            <Card className="p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Current Connection</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {walletAddress}
                  </p>
                  <Badge variant="secondary" className="mt-2">Active</Badge>
                </div>
              </div>
            </Card>
          )}

          {/* Installation Limit Warning */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              XMTP allows up to 10 installations per wallet. If you've reached the limit, 
              you'll need to clear old installations to create new ones.
            </AlertDescription>
          </Alert>

          {/* Stored Installations */}
          <div>
            <h3 className="font-medium mb-3">Stored Installations ({installations.length})</h3>
            
            {installations.length === 0 ? (
              <Card className="p-6 text-center">
                <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No stored installations found
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {installations.map((installation, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">
                          {installation.address}
                        </p>
                        {installation.timestamp && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Stored: {installation.timestamp}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => clearInstallation(installation.address)}
                        disabled={isClearing}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Hidden Conversations Management */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium">Hidden Conversations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage conversations you've hidden by swiping left and deleting.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={clearHiddenConversations}
              className="w-full"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Unhide All Conversations ({xmtpConversationManager.getHiddenConversations().length})
            </Button>
          </div>

          {/* Danger Zone */}
          {installations.length > 0 && (
            <div className="border border-destructive/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h3 className="font-medium text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will clear all XMTP installations and disconnect you. 
                    Use this if you're experiencing issues or have reached the installation limit.
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={clearAllInstallations}
                disabled={isClearing}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Installations
              </Button>
            </div>
          )}

          {/* Help Text */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-2">
              <p>
                <strong>What are installations?</strong><br />
                XMTP creates a cryptographic installation for each device/browser combination. 
                Each installation allows you to send and receive messages.
              </p>
              <p>
                <strong>Why clear installations?</strong><br />
                If you've reached the 10 installation limit, clearing old installations 
                (from browsers you no longer use) allows you to create new ones.
              </p>
              <p>
                <strong>Is it safe?</strong><br />
                Yes. Your message history is stored on the XMTP network. You can always 
                reconnect and access your messages.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};
