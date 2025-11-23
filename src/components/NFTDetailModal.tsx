import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Share2, Copy, Check } from "lucide-react";
import { useState } from "react";

interface NFTDetailModalProps {
  nft: any;
  isOpen: boolean;
  onClose: () => void;
}

export const NFTDetailModal = ({ nft, isOpen, onClose }: NFTDetailModalProps) => {
  const [copied, setCopied] = useState(false);

  if (!nft) return null;

  const handleCopyContract = async () => {
    if (nft.contract) {
      await navigator.clipboard.writeText(nft.contract);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share && nft.opensea_url) {
      try {
        await navigator.share({
          title: nft.name || 'NFT',
          text: `Check out this NFT: ${nft.name || 'Untitled'}`,
          url: nft.opensea_url,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    }
  };

  const getChainIcon = (chain: string) => {
    const icons: Record<string, string> = {
      ethereum: '⟠',
      polygon: '⬡',
      arbitrum: '🔷',
      optimism: '🔴',
      base: '🔵',
      avalanche: '🔺',
      bsc: '🟡',
      solana: '◎',
      zora: '⚡',
    };
    return icons[chain.toLowerCase()] || '🔗';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-[#D4AF37]/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#D4AF37] flex items-center gap-2">
            {nft.name || `NFT #${nft.identifier}`}
            {nft.chain && (
              <Badge variant="outline" className="text-[#D4AF37] border-[#D4AF37]/30 capitalize">
                {getChainIcon(nft.chain)} {nft.chain}
              </Badge>
            )}
            {nft.quantity && nft.quantity > 1 && (
              <Badge className="bg-emerald-600 text-white border-0">
                x{nft.quantity} Owned
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="aspect-square rounded-xl overflow-hidden border-4 border-[#D4AF37]/20 bg-black/20">
              {nft.image_url ? (
                <img
                  src={nft.image_url}
                  alt={nft.name || 'NFT'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Image Available
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {nft.opensea_url && (
                <Button
                  onClick={() => window.open(nft.opensea_url, '_blank')}
                  className="flex-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on OpenSea
                </Button>
              )}
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-[#D4AF37]/30"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Collection Info */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Collection</h3>
              <p className="text-muted-foreground">{nft.collection || 'Unknown Collection'}</p>
            </div>

            <Separator className="bg-border/50" />

            {/* Contract Address */}
            {nft.contract && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Contract Address</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted/50 rounded-md text-xs text-muted-foreground truncate">
                      {nft.contract}
                    </code>
                    <Button
                      onClick={handleCopyContract}
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Separator className="bg-border/50" />
              </>
            )}

            {/* Token ID */}
            {nft.identifier && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Token ID</h3>
                  <p className="text-muted-foreground font-mono">#{nft.identifier}</p>
                </div>
                <Separator className="bg-border/50" />
              </>
            )}

            {/* Description */}
            {nft.description && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {nft.description}
                  </p>
                </div>
                <Separator className="bg-border/50" />
              </>
            )}

            {/* Metadata/Traits */}
            {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Traits</h3>
                <div className="grid grid-cols-2 gap-3">
                  {nft.metadata.attributes.slice(0, 8).map((trait: any, index: number) => (
                    <Card
                      key={index}
                      className="p-3 bg-card/50 backdrop-blur-sm border-[#D4AF37]/20"
                    >
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {trait.trait_type}
                      </div>
                      <div className="text-sm font-semibold text-foreground truncate">
                        {trait.value}
                      </div>
                    </Card>
                  ))}
                </div>
                {nft.metadata.attributes.length > 8 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    +{nft.metadata.attributes.length - 8} more traits
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
