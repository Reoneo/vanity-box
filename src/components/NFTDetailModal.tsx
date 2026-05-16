import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Play, Volume2, ChevronDown, X } from "lucide-react";
import { useEffect, useRef } from "react";


// Import network logos for chain icons
import ethLogo from "@/assets/eth-logo.png";
import wldLogo from "@/assets/wld-logo.png";
import polygonIcon from "@/assets/polygon-icon.svg";
import iotaHeaderPattern from "@/assets/iota-header-pattern.png";

interface NFTDetailModalProps {
  nft: any;
  isOpen: boolean;
  onClose: () => void;
  headerImage?: string;
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
    case 'polygon-pos':
    case 'polygon-mainnet':
      return <img src={polygonIcon} alt="Polygon" width={size} height={size} className={iconClass} />;
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

export const NFTDetailModal = ({ nft, isOpen, onClose, headerImage }: NFTDetailModalProps) => {
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

  return (
    <div
      className="fixed left-0 right-0 bg-background dark:bg-black z-[9999] animate-fade-in flex flex-col overscroll-contain"
      style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 0 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Banner header — mirrors NFT collection overlay style */}
      <div
        className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
        style={{ backgroundImage: `url(${headerImage || iotaHeaderPattern})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
          <button
            onClick={onClose}
            aria-label="Back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
          >
            <ChevronDown className="w-4 h-4 text-black rotate-90" />
          </button>
          <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm max-w-[60%]">
            <h3 className="text-lg font-bold text-black dark:text-white truncate">
              {nft.name || `NFT #${nft.identifier}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
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
