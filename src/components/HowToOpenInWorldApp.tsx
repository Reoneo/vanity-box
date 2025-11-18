import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import worldAppIcon from "@/assets/world-app-icon.png";

interface HowToOpenInWorldAppProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToOpenInWorldApp: React.FC<HowToOpenInWorldAppProps> = ({ isOpen, onClose }) => {
  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    toast.success("Link copied! Paste it in World App browser");
  };

  const handleOpenInWorldApp = () => {
    // Deep link to World App with current URL
    const worldAppDeepLink = `https://worldapp.org/mini-app?app_id=app_ed7e61cb0c52630464178eed59e3fbdd`;
    window.open(worldAppDeepLink, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <img src={worldAppIcon} alt="World App" className="w-10 h-10" />
            <DialogTitle>Open in World App</DialogTitle>
          </div>
          <DialogDescription>
            To use WLD or USDC payments, you need to access Vanity.box from within the World App.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Method 1: Direct Access</h4>
            <p className="text-sm text-muted-foreground">
              Open World App and find Vanity.box in the Mini Apps section
            </p>
            <Button onClick={handleOpenInWorldApp} className="w-full" variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open World App
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Method 2: Copy Link</h4>
            <p className="text-sm text-muted-foreground">
              Copy this page's URL and paste it in World App's browser
            </p>
            <Button onClick={handleCopyLink} className="w-full" variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy Current URL
            </Button>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg mt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> APT payments work in any browser if you have Petra Wallet installed. 
              Only WLD and USDC payments require World App.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
