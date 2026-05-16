import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Play, Volume2, ChevronDown, X, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow, isPast, addDays } from "date-fns";
import { extractLabel, labelhash, labelhashToTokenId } from "@/lib/ens";


// Import network logos for chain icons
import ethLogo from "@/assets/eth-logo.png";
import ethLogoBlueCircle from "@/assets/eth-logo-blue-circle.png";
import wldLogo from "@/assets/wld-logo.png";
import polygonIcon from "@/assets/polygon-icon.svg";
import iotaHeaderPattern from "@/assets/iota-header-pattern.png";
import ensMarkBlue from "@/assets/ens-mark-blue.png";
import openseaLogomark from "@/assets/opensea-logomark-white.svg";
import grailsLogo from "@/assets/grails-logo.svg";
import ensCollectionLogo from "@/assets/ens-collection-logo.png";
import basenamesCollectionLogo from "@/assets/basenames-collection-logo.png";
import baseSquareBlue from "@/assets/base-square-blue.png";

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
      return <img src={ethLogoBlueCircle} alt="Ethereum" width={size} height={size} className={iconClass} />;
    case 'worldchain':
      return <img src={wldLogo} alt="World Chain" width={size} height={size} className={iconClass} />;
    case 'polygon':
    case 'matic':
    case 'polygon-pos':
    case 'polygon-mainnet':
      return <img src={polygonIcon} alt="Polygon" width={size} height={size} className={iconClass} />;
    case 'base':
      return <img src={baseSquareBlue} alt="Base" width={size} height={size} className="object-contain" style={{ borderRadius: size * 0.2 }} />;
    default:
      return <img src={ethLogo} alt="Network" width={size} height={size} className={iconClass} />;
  }
};

const normalizeEnsAttrKey = (value: unknown) =>
  String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const parseEnsDateValue = (value: unknown): Date | null => {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric < 1e12 ? numeric * 1000 : numeric);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const NFTDetailModal = ({ nft, isOpen, onClose, headerImage }: NFTDetailModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ensAttrs, setEnsAttrs] = useState<any[] | null>(null);
  const [ensExpiryDate, setEnsExpiryDate] = useState<Date | null>(null);

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

  // Fetch ENS metadata directly (always includes Expiration Date)
  useEffect(() => {
    if (!isOpen || !nft) return;
    setEnsAttrs(null);
    setEnsExpiryDate(null);
    const ensContract = '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85';
    const wrapperContract = '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401';
    const c = (nft.contract || '').toLowerCase();
    const col = (nft.collection || '').toLowerCase();
    const nm = (nft.name || '').toLowerCase();
    const isEns =
      c === ensContract || c === wrapperContract ||
      col === 'ens' || col.includes('ethereum name service') || nm.endsWith('.eth');
    if (!isEns) return;
    let cancelled = false;
    const label = nm.endsWith('.eth') ? extractLabel(nm) : '';
    const labelTokenId = label && !label.includes('.') ? labelhashToTokenId(labelhash(label)).toString() : null;
    const contract = labelTokenId ? ensContract : (c === wrapperContract ? wrapperContract : ensContract);
    const metadataTokenId = labelTokenId || nft.identifier;
    if (metadataTokenId) {
      const url = `https://metadata.ens.domains/mainnet/${contract}/${metadataTokenId}`;
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data?.attributes) return;
          setEnsAttrs(data.attributes);
        })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [isOpen, nft]);


  if (!isOpen || !nft) return null;

  const animationUrl = nft.animation_url || nft.metadata?.animation_url;
  const imageUrl = nft.image_url || nft.display_image_url;
  const mediaType = getMediaType(animationUrl);

  // Detect ENS NFT and extract expiry from attributes/traits
  const ensContract = '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85';
  const wrapperContract = '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401';
  const contractLower = (nft.contract || '').toLowerCase();
  const collectionLower = (nft.collection || '').toLowerCase();
  const nameLower = (nft.name || '').toLowerCase();
  const isBasenameNft =
    collectionLower === 'basenames' ||
    collectionLower === 'basename' ||
    collectionLower === 'base names' ||
    nameLower.endsWith('.base.eth');
  const isEnsNft =
    !isBasenameNft && (
      contractLower === ensContract ||
      contractLower === wrapperContract ||
      collectionLower === 'ens' ||
      collectionLower.includes('ethereum name service') ||
      nameLower.endsWith('.eth')
    );

  const attributes: any[] =
    (ensAttrs && ensAttrs.length ? ensAttrs : null) ||
    nft.metadata?.attributes || nft.traits || nft.metadata?.traits || [];
  const findAttr = (keys: string[]) =>
    attributes.find((a: any) => {
      const t = normalizeEnsAttrKey(a?.trait_type || a?.traitType || a?.name || a?.key);
      return keys.some((k) => t === normalizeEnsAttrKey(k));
    });

  const expiryAttr = findAttr(['Expiration Date', 'Expiration', 'Expires', 'Expiry', 'Expiry Date', 'Name Expires']);
  const rawExpiry = expiryAttr?.value ?? expiryAttr?.display_value;
  const expiryDate = parseEnsDateValue(rawExpiry) || ensExpiryDate;
  const expiryExpired = expiryDate ? isPast(expiryDate) : false;

  const regAttr = findAttr(['Registration Date', 'Created Date', 'Created']);
  const rawReg = regAttr?.value ?? regAttr?.display_value;
  const registrationDate = parseEnsDateValue(rawReg);
  const ensLabel = nameLower.endsWith('.eth') ? extractLabel(nameLower) : (nft.name || '').toString().replace(/\.eth$/i, '');
  const domainFullName = isBasenameNft ? (nft.name || '').toString() : `${ensLabel}.eth`;
  const graceEndDate = expiryDate ? addDays(expiryDate, 90) : null;
  const graceEnded = graceEndDate ? isPast(graceEndDate) : false;

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
          <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm max-w-[60%] flex items-center justify-center">
            {isEnsNft ? (
              <img src={ensCollectionLogo} alt="ENS" className="h-5 w-auto object-contain" />
            ) : collectionLower === 'basenames' || collectionLower === 'basename' || collectionLower === 'base names' ? (
              <img src={basenamesCollectionLogo} alt="Basenames" className="h-5 w-auto object-contain" />
            ) : (
              <h3 className="text-lg font-bold text-black dark:text-white truncate">
                {nft.name || `NFT #${nft.identifier}`}
              </h3>
            )}
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
      <div className="flex-1 overflow-y-auto overscroll-contain">
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
          {!isEnsNft && (
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight break-words">
              {nft.name || `NFT #${nft.identifier}`}
            </h2>
          )}

          {isEnsNft && nft.name && (
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight break-words">
              {nft.name}
            </h2>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {nft.chain && (
              <Badge variant="outline" className="bg-muted/60 border-[#D4AF37]/40 text-foreground capitalize flex items-center gap-1.5 px-2.5 py-1 rounded-full">
                {getChainIcon(nft.chain, 14)}
                <span className="text-xs font-medium">{nft.chain}</span>
              </Badge>
            )}
            {isEnsNft ? (
              <div className="flex items-center gap-2">
                <a
                  href={`https://app.ens.domains/${ensLabel}.eth`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on ENS"
                  className="w-7 h-7 rounded-full bg-muted/60 border border-border/40 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <img src={ensMarkBlue} alt="ENS" className="w-4 h-4 object-contain" />
                </a>
                {nft.opensea_url && (
                  <a
                    href={nft.opensea_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on OpenSea"
                    className="w-7 h-7 rounded-full bg-[#2081E2] border border-border/40 flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <img src={openseaLogomark} alt="OpenSea" className="w-4 h-4 object-contain" />
                  </a>
                )}
                <a
                  href={`https://grails.app/${ensLabel}.eth`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on Grails"
                  className="w-7 h-7 rounded-full bg-muted/60 border border-border/40 flex items-center justify-center hover:bg-muted transition-colors overflow-hidden"
                >
                  <img src={grailsLogo} alt="Grails" className="w-4 h-4 object-contain" />
                </a>
              </div>
            ) : (
              nft.collection && nft.collection !== nft.name && (
                <Badge variant="outline" className="bg-muted/40 border-border/40 text-muted-foreground text-xs capitalize rounded-full px-2.5 py-1">
                  {nft.collection}
                </Badge>
              )
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

          {isEnsNft && (expiryDate || registrationDate) && (
            <div className="space-y-2 bg-muted/30 rounded-xl p-3 border border-[#D4AF37]/15">
              {registrationDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Registered</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {format(registrationDate, 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              {expiryDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Expires</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${expiryExpired ? 'text-red-500' : 'text-foreground'}`}>
                      {format(expiryDate, 'MMM d, yyyy')}
                    </div>
                    <div className={`text-[10px] ${expiryExpired ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {expiryExpired
                        ? `Expired ${formatDistanceToNow(expiryDate)} ago`
                        : `in ${formatDistanceToNow(expiryDate)}`}
                    </div>
                  </div>
                </div>
              )}
              {graceEndDate && expiryExpired && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Grace period ends</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${graceEnded ? 'text-red-500' : 'text-amber-500'}`}>
                      {format(graceEndDate, 'MMM d, yyyy')}
                    </div>
                    <div className={`text-[10px] ${graceEnded ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {graceEnded
                        ? `Ended ${formatDistanceToNow(graceEndDate)} ago`
                        : `in ${formatDistanceToNow(graceEndDate)}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action */}
        {!isEnsNft && nft.opensea_url && (
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
    </div>
  );
};
