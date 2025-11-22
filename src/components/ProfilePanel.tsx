import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ProfilePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headerImage?: string;
  avatar?: string;
  primaryName?: string;
  walletAddress?: string;
  bio?: string;
  followingCount?: number;
  email?: string;
  website?: string;
}

export const ProfilePanel = ({
  open,
  onOpenChange,
  headerImage,
  avatar,
  primaryName,
  walletAddress,
  bio,
  followingCount,
  email,
  website,
}: ProfilePanelProps) => {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-background/90 border-[#D4AF37]/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#D4AF37]">👤 Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Image */}
          {headerImage && (
            <div className="w-full h-40 rounded-xl overflow-hidden border-2 border-[#D4AF37]/20">
              <img src={headerImage} alt="Header" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Avatar and Primary Name */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-[#D4AF37]/30">
              <AvatarImage src={avatar} alt={primaryName} />
              <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37] text-2xl">
                {primaryName?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">{primaryName || 'Unknown'}</h2>
              {walletAddress && (
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-sm text-muted-foreground">{shortenAddress(walletAddress)}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyAddress}
                    className="h-6 w-6 p-0"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <div className="bg-card/30 rounded-lg p-4 border border-border/50">
              <p className="text-sm text-muted-foreground">{bio}</p>
            </div>
          )}

          {/* EFP Following */}
          {followingCount !== undefined && followingCount > 0 && (
            <div className="bg-card/30 rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Following:</span>
                <span className="text-sm text-[#D4AF37]">{followingCount}</span>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {(email || website) && (
            <div className="space-y-2">
              {email && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <a href={`mailto:${email}`} className="text-[#D4AF37] hover:underline">
                    {email}
                  </a>
                </div>
              )}
              {website && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Website:</span>
                  <a href={website} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">
                    {website}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
