import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConnectModal, useCurrentAccount } from "@iota/dapp-kit";
import iotaLogo from "@/assets/vanity-iota-avatar.png";
import { Wallet } from "lucide-react";

interface ConnectWalletChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConnect: () => void;
  walletConnectLabel?: string;
}

export function ConnectWalletChooser({
  open,
  onOpenChange,
  onWalletConnect,
  walletConnectLabel = "WalletConnect",
}: ConnectWalletChooserProps) {
  const currentIotaAccount = useCurrentAccount();
  const [iotaModalOpen, setIotaModalOpen] = React.useState(false);

  const isIotaConnected = !!currentIotaAccount?.address;

  // If IOTA is already connected, dispatch event and close
  React.useEffect(() => {
    if (isIotaConnected && currentIotaAccount?.address) {
      console.log('[ConnectWalletChooser] IOTA wallet connected:', currentIotaAccount.address);
      window.dispatchEvent(new CustomEvent('wallet-connected', {
        detail: {
          walletAddress: currentIotaAccount.address,
          walletType: 'iota',
          username: null, // Will be resolved by profile lookup
        }
      }));
    }
  }, [isIotaConnected, currentIotaAccount?.address]);

  const handleIotaConnect = () => {
    onOpenChange(false);
    // Small delay to let dialog close before opening IOTA modal
    setTimeout(() => {
      setIotaModalOpen(true);
    }, 100);
  };

  const handleWalletConnect = () => {
    onOpenChange(false);
    onWalletConnect();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[420px] bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Connect Wallet</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              onClick={handleIotaConnect}
              className="h-14 justify-start gap-4 px-4 hover:bg-accent/50 border-border"
            >
              <img src={iotaLogo} alt="IOTA" className="w-8 h-8 rounded-full" />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-foreground">Connect IOTA</span>
                <span className="text-xs text-muted-foreground">For .iota domains & IOTA L1</span>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={handleWalletConnect}
              className="h-14 justify-start gap-4 px-4 hover:bg-accent/50 border-border"
            >
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-foreground">{walletConnectLabel}</span>
                <span className="text-xs text-muted-foreground">For EVM wallets (ETH, Polygon, etc.)</span>
              </div>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Choose IOTA for .iota domains. Use WalletConnect for EVM-based wallets.
          </p>
        </DialogContent>
      </Dialog>

      {/* IOTA's built-in connect flow - uses controlled modal with hidden trigger */}
      <ConnectModal 
        trigger={<span style={{ display: 'none' }} />}
        open={iotaModalOpen} 
        onOpenChange={(open) => {
          setIotaModalOpen(open);
        }}
        onConnected={({ wallet }) => {
          console.log('[ConnectWalletChooser] IOTA wallet connected via modal:', wallet.name);
          setIotaModalOpen(false);
        }}
      />
    </>
  );
}
