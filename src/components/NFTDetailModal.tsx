import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Share2, Copy, Check, Play, Volume2 } from "lucide-react";
import { useState, useRef } from "react";

interface NFTDetailModalProps {
  nft: any;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to detect media type from URL
const getMediaType = (url: string | null | undefined): 'video' | 'audio' | 'image' => {
  if (!url) return 'image';
  const lower = url.toLowerCase();
  if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.ogv') || lower.includes('video')) {
    return 'video';
  }
  if (lower.includes('.mp3') || lower.includes('.wav') || lower.includes('.ogg') || lower.includes('.m4a') || lower.includes('audio')) {
    return 'audio';
  }
  return 'image';
};

export const NFTDetailModal = ({ nft, isOpen, onClose }: NFTDetailModalProps) => {
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  // Determine media type and URL
  const animationUrl = nft.animation_url || nft.metadata?.animation_url;
  const imageUrl = nft.image_url || nft.display_image_url;
  const mediaType = getMediaType(animationUrl);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-[#D4AF37]/30 p-0">
        {/* Full Width Media */}
        <div className="relative w-full aspect-square overflow-hidden bg-black/20">
          {mediaType === 'video' && animationUrl ? (
            <video
              ref={videoRef}
              src={animationUrl}
              poster={imageUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-contain"
            />
          ) : mediaType === 'audio' && animationUrl ? (
            <div className="relative w-full h-full">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={nft.name || 'NFT'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5">
                  <Volume2 className="w-24 h-24 text-[#D4AF37]/50" />
                </div>
              )}
              <audio
                ref={audioRef}
                src={animationUrl}
                controls
                autoPlay
                loop
                className="absolute bottom-4 left-4 right-4"
              />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={nft.name || 'NFT'}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Media Available
            </div>
          )}
          
          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 sm:p-6 pointer-events-none">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {nft.name || `NFT #${nft.identifier}`}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {nft.chain && (
                <Badge variant="outline" className="bg-black/70 backdrop-blur-sm border-white/30 text-white capitalize">
                  {getChainIcon(nft.chain)} {nft.chain}
                </Badge>
              )}
              {nft.quantity && nft.quantity > 1 && (
                <Badge className="bg-emerald-600 text-white border-0">
                  x{nft.quantity} Owned
                </Badge>
              )}
              {mediaType === 'video' && (
                <Badge className="bg-purple-600 text-white border-0">
                  <Play className="w-3 h-3 mr-1" /> Video
                </Badge>
              )}
              {mediaType === 'audio' && (
                <Badge className="bg-blue-600 text-white border-0">
                  <Volume2 className="w-3 h-3 mr-1" /> Audio
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {nft.opensea_url && (
              <Button
                onClick={() => window.open(nft.opensea_url, '_blank')}
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold active:scale-95 transition-transform touch-manipulation"
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on OpenSea
              </Button>
            )}
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 active:scale-95 transition-transform touch-manipulation"
              size="lg"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          
          {nft.contract && (
            <Button
              onClick={handleCopyContract}
              variant="outline"
              className="w-full border-border/50 hover:bg-muted/50 active:scale-95 transition-transform touch-manipulation"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-500" />
                  Contract Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Contract Address
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
