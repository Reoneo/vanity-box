import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Play, Volume2, ChevronLeft, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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

// Network chain icons
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
        </svg>
      );
    case 'base':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#0052FF" />
        </svg>
      );
    default:
      return <img src={ethLogo} alt="Network" width={size} height={size} className={iconClass} />;
  }
};

export const NFTDetailModal = ({ nft, isOpen, onClose }: NFTDetailModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !nft) return null;

  const animationUrl = nft.animation_url || nft.metadata?.animation_url;
  const imageUrl = nft.image_url || nft.display_image_url;
  const mediaType = getMediaType(animationUrl);

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] bg-background overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Top bar with gold rounded back & close buttons — rendered via portal so it always sits above the global header */}
      <div className="sticky top-0 z-[210] flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-md border-b border-[#D4AF37]/20 pt-safe-area-inset-top">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black flex items-center justify-center transition-all active:scale-95 shadow-md"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>

        <h1 className="text-base font-semibold text-foreground truncate px-3 max-w-[60%] text-center">
          {nft.name || `NFT #${nft.identifier}`}
        </h1>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black flex items-center justify-center transition-all active:scale-95 shadow-md"
        >
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl px-4 py-4 pb-28">
        {/* Media — square, fully contained, no overflow */}
        <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-black/40 to-black/10 border border-[#D4AF37]/20">
          {mediaType === 'video' && animationUrl ? (
            <video
              ref={videoRef}
              src={animationUrl}
              poster={imageUrl}
              controls
              autoPlay
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : mediaType === 'audio' && animationUrl ? (
            <div className="relative w-full h-full">
              {imageUrl ? (
                <img src={imageUrl} alt={nft.name || 'NFT'} className="absolute inset-0 w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5">
                  <Volume2 className="w-24 h-24 text-[#D4AF37]/50" />
                </div>
              )}
              <audio ref={audioRef} src={animationUrl} controls autoPlay loop className="absolute bottom-4 left-4 right-4" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={nft.name || 'NFT'}
              className="absolute inset-0 w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              No Media Available
            </div>
          )}

          {(mediaType === 'video' || mediaType === 'audio') && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-black/70 backdrop-blur-sm text-white border-0 gap-1">
                {mediaType === 'video' ? <Play className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                {mediaType === 'video' ? 'Video' : 'Audio'}
              </Badge>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="pt-5 space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight break-words">
            {nft.name || `NFT #${nft.identifier}`}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {nft.chain && (
              <Badge variant="outline" className="bg-muted/60 border-[#D4AF37]/40 text-foreground capitalize flex items-center gap-1.5 px-2.5 py-1 rounded-full">
                {getChainIcon(nft.chain, 14)}
                <span className="text-xs font-medium">{nft.chain}</span>
              </Badge>
            )}
            {nft.collection && nft.collection !== nft.name && (
              <Badge variant="outline" className="bg-muted/40 border-border/40 text-muted-foreground text-xs capitalize rounded-full px-2.5 py-1">
                {nft.collection}
              </Badge>
            )}
            {nft.quantity && nft.quantity > 1 && (
              <Badge className="bg-emerald-600 text-white border-0 text-xs rounded-full">
                x{nft.quantity} Owned
              </Badge>
            )}
          </div>

          {nft.description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
              {nft.description}
            </p>
          )}
        </div>

        {/* Action */}
        {nft.opensea_url && (
          <div className="pt-5">
            <Button
              onClick={() => window.open(nft.opensea_url, '_blank')}
              className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold active:scale-95 transition-transform touch-manipulation rounded-xl"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on OpenSea
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
