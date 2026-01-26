import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Play, Volume2, ShoppingBag } from "lucide-react";
import { useRef } from "react";

// Import network logos for chain icons
import ethLogo from "@/assets/eth-logo.png";
import wldLogo from "@/assets/wld-logo.png";

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

// Network chain icons using same style as WalletConnect NetworkIcon
const getChainIcon = (chain: string, size: number = 16) => {
  const iconClass = "rounded-full";
  const chainLower = chain.toLowerCase();
  
  switch (chainLower) {
    case 'ethereum':
    case 'eth':
      return <img src={ethLogo} alt="Ethereum" width={size} height={size} className={iconClass} />;
    case 'worldchain':
      return <img src={wldLogo} alt="World Chain" width={size} height={size} className={iconClass} />;
    case 'polygon':
    case 'matic':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path d="M21.2 13.2c-.5-.3-1.1-.3-1.5 0l-3.5 2-2.4 1.4-3.5 2c-.5.3-1.1.3-1.5 0l-2.7-1.6c-.5-.3-.8-.8-.8-1.4v-3.1c0-.6.3-1.1.8-1.4l2.7-1.5c.5-.3 1.1-.3 1.5 0l2.7 1.6c.5.3.8.8.8 1.4v2l2.4-1.4v-2c0-.6-.3-1.1-.8-1.4l-5-2.9c-.5-.3-1.1-.3-1.5 0l-5.1 2.9c-.5.3-.8.8-.8 1.4v5.8c0 .6.3 1.1.8 1.4l5.1 2.9c.5.3 1.1.3 1.5 0l3.5-2 2.4-1.4 3.5-2c.5-.3 1.1-.3 1.5 0l2.7 1.5c.5.3.8.8.8 1.4v3.1c0 .6-.3 1.1-.8 1.4l-2.7 1.6c-.5.3-1.1.3-1.5 0l-2.7-1.6c-.5-.3-.8-.8-.8-1.4v-2l-2.4 1.4v2c0 .6.3 1.1.8 1.4l5.1 2.9c.5.3 1.1.3 1.5 0l5.1-2.9c.5-.3.8-.8.8-1.4v-5.8c0-.6-.3-1.1-.8-1.4l-5.1-2.9z" fill="#fff"/>
        </svg>
      );
    case 'arbitrum':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#2D374B" />
          <path d="M16.6 8.5l6.9 11c.2.3.2.7 0 1l-2.5 4c-.2.3-.5.5-.9.5h-8.2c-.4 0-.7-.2-.9-.5l-2.5-4c-.2-.3-.2-.7 0-1l6.9-11c.4-.6 1.4-.6 1.8 0h-.6z" fill="#28A0F0"/>
          <path d="M15.4 13l-4.9 7.8 2 3.2h6.8l-3.9-11z" fill="#fff"/>
        </svg>
      );
    case 'optimism':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#FF0420" />
          <path d="M10.5 20.5c-1.9 0-3.4-.6-4.5-1.7-1.1-1.2-1.6-2.8-1.6-4.8 0-2.2.6-4 1.8-5.4 1.2-1.4 2.9-2.1 5-2.1 1.9 0 3.3.5 4.3 1.6 1 1 1.5 2.5 1.5 4.3v.8H7.5c0 1.3.3 2.3 1 3 .6.7 1.5 1 2.6 1 .8 0 1.5-.1 2-.4.6-.3 1-.7 1.3-1.3h3.4c-.5 1.4-1.3 2.5-2.5 3.3-1.1.8-2.5 1.2-4.2 1.2h-.6z" fill="#fff"/>
        </svg>
      );
    case 'base':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#0052FF" />
          <path d="M16 26c5.523 0 10-4.477 10-10S21.523 6 16 6 6 10.477 6 16s4.477 10 10 10z" fill="#0052FF"/>
          <path d="M16 24c4.418 0 8-3.582 8-8s-3.582-8-8-8c-4.08 0-7.446 3.054-7.938 7h11.876v2H8.062c.492 3.946 3.858 7 7.938 7z" fill="#fff"/>
        </svg>
      );
    case 'bsc':
    case 'binance':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path d="M12.1 14.5l3.9-3.9 3.9 3.9 2.3-2.3L16 6l-6.2 6.2 2.3 2.3zm-4.6 1.5L5.2 16l2.3 2.3L9.8 16l-2.3-2zm4.6 1.5L16 21.4l3.9-3.9 2.3 2.3-6.2 6.2-6.2-6.2 2.3-2.4v.1zm10.7-1.5L20.5 16l2.3 2.3 2.3-2.3-2.3-2zM18.3 16L16 13.7 14.3 15.4l-.4.4-.3.2 2.4 2.4L18.3 16z" fill="#fff"/>
        </svg>
      );
    case 'avalanche':
    case 'avax':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#E84142" />
          <path d="M20.3 21h3.5c.6 0 .9 0 1.1-.2.2-.1.4-.4.4-.6 0-.2-.1-.5-.2-.8l-7.6-13.5c-.2-.3-.4-.6-.6-.7-.2-.2-.5-.2-.9-.2s-.7.1-.9.2c-.2.2-.4.4-.6.7L13 8.8l-1.7 3-.1.2c-.2.3-.3.6-.3.9 0 .3.1.5.3.7.2.2.5.3.8.3h4.3l.2.1c.2.1.3.3.5.6l2.4 4.4c.2.3.3.5.3.7 0 .2-.1.5-.3.7-.2.2-.5.3-.9.3H11.9c-.4 0-.7 0-.9.2-.2.2-.4.4-.4.7 0 .2.1.5.2.8l1.5 2.7c.2.3.3.5.5.7.2.1.5.2.9.2h6.6z" fill="#fff"/>
        </svg>
      );
    case 'zora':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#000" />
          <circle cx="16" cy="16" r="8" fill="#fff" />
        </svg>
      );
    case 'solana':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#000" />
          <defs>
            <linearGradient id="sol-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <path d="M9.5 18.8l2.2-2.2c.1-.1.3-.2.4-.2h10.4c.3 0 .4.3.2.5l-2.2 2.2c-.1.1-.3.2-.4.2H9.7c-.3 0-.4-.3-.2-.5zm2.2-6.3c.1-.1.3-.2.4-.2h10.4c.3 0 .4.3.2.5l-2.2 2.2c-.1.1-.3.2-.4.2H9.7c-.3 0-.4-.3-.2-.5l2.2-2.2zm8.6-2.3l-2.2 2.2c-.1.1-.3.2-.4.2H7.3c-.3 0-.4-.3-.2-.5l2.2-2.2c.1-.1.3-.2.4-.2h10.4c.3 0 .4.3.2.5z" fill="url(#sol-grad)"/>
        </svg>
      );
    default:
      return <img src={ethLogo} alt="Network" width={size} height={size} className={iconClass} />;
  }
};

export const NFTDetailModal = ({ nft, isOpen, onClose }: NFTDetailModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!nft) return null;

  // Extract name for grails.app link - use the NFT name if it looks like a domain
  const getNftNameForOffer = () => {
    const name = nft.name || '';
    // If the name looks like a domain (contains .), use it directly
    if (name.includes('.')) {
      return name;
    }
    // Otherwise use the collection name or identifier
    return nft.collection || nft.identifier || name;
  };

  const handleMakeOffer = () => {
    const name = getNftNameForOffer();
    window.open(`https://grails.app/${name}`, '_blank');
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
                <Badge variant="outline" className="bg-black/70 backdrop-blur-sm border-white/30 text-white capitalize flex items-center gap-1.5">
                  {getChainIcon(nft.chain, 14)}
                  <span>{nft.chain}</span>
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
              onClick={handleMakeOffer}
              variant="outline"
              className="w-full border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 active:scale-95 transition-transform touch-manipulation"
              size="lg"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Make Offer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
