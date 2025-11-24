import React, { useState } from 'react';
import { usePush } from '@/contexts/PushContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { pushConversationManager } from '@/lib/pushConversationManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const PushSettings = () => {
  const { walletAddress, disconnect } = usePush();
  const [isOpen, setIsOpen] = useState(false);

  const clearHiddenConversations = () => {
    if (confirm('Are you sure you want to unhide all conversations?')) {
      pushConversationManager.clearHiddenConversations();
      toast.success('All conversations unhidden');
      setIsOpen(false);
      window.location.reload();
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect from Push Protocol?')) {
      disconnect();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Push Protocol Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Status */}
          {walletAddress && (
            <div className="space-y-2">
              <h3 className="font-semibold">Current Connection</h3>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-mono break-all">{walletAddress}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          )}

          {/* Hidden Conversations */}
          <div className="space-y-2">
            <h3 className="font-semibold">Hidden Conversations</h3>
            <p className="text-sm text-muted-foreground">
              Unhide all previously hidden conversations
            </p>
            <Button
              variant="outline"
              onClick={clearHiddenConversations}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Unhide All Conversations
            </Button>
          </div>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Push Protocol enables decentralized, encrypted messaging. Your messages are
              stored on the Push network and synced across devices.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};
