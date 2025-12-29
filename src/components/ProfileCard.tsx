import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, MessageCircle, Repeat2, Heart, Loader2, Search, Filter, ChevronDown, Link2, Globe, Mail, Calendar, X, BadgeCheck } from "lucide-react";
import { SocialIcon } from "./SocialIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { PoapDetailModal } from "./PoapDetailModal";
import { NFTDetailModal } from "./NFTDetailModal";
import { ActivityGraph } from "./ActivityGraph";
import { formatDistanceToNow } from "date-fns";
import type { FarcasterCast } from "@/types/farcaster";
import defaultHeader from '@/assets/default-header-pattern.png';
import vanityBoxAvatar from '@/assets/vanity-box-default-avatar.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

interface ProfileCardProps {
  activeSection: 'profile' | 'socials' | 'nfts' | 'farcaster';
  web3BioProfile?: any;
  currentWalletAddress?: string;
  connectedWalletAddress?: string;
  efpStats?: any;
  poaps?: any[];
  socialIcons?: Record<string, string>;
  nfts?: any[];
  nftLoading?: boolean;
  nftNextCursor?: string | null;
  latestCast?: FarcasterCast | null;
  castLoading?: boolean;
  firstTransactionDate?: string | null;
  searchedIdentity?: string;
  isWorldIdVerified?: boolean;
  onFollowingClick?: () => void;
  onFollowersClick?: () => void;
  onLoadMoreNfts?: () => void;
}

export const ProfileCard = ({
  activeSection,
  web3BioProfile,
  currentWalletAddress,
  connectedWalletAddress,
  efpStats,
  poaps = [],
  socialIcons = {},
  nfts = [],
  nftLoading = false,
  nftNextCursor = null,
  latestCast = null,
  castLoading = false,
  firstTransactionDate = null,
  searchedIdentity,
  isWorldIdVerified = false,
  onFollowingClick,
  onFollowersClick,
  onLoadMoreNfts,
}: ProfileCardProps) => {
  const [copied, setCopied] = useState(false);
  const [selectedPoap, setSelectedPoap] = useState<any>(null);
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [showAllSocials, setShowAllSocials] = useState(false);
  const [showNftsOverlay, setShowNftsOverlay] = useState(false);
  const [nftCategory, setNftCategory] = useState<'main' | 'poaps' | 'opensea' | 'magiceden' | 'hyperliquid'>('main');
  const [magicEdenNfts, setMagicEdenNfts] = useState<any[]>([]);
  const [magicEdenLoading, setMagicEdenLoading] = useState(false);
  const [hlNfts, setHlNfts] = useState<any[]>([]);
  const [hlTokens, setHlTokens] = useState<any[]>([]);
  const [hlLoading, setHlLoading] = useState(false);
  const [portfolioTokens, setPortfolioTokens] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioTotalValue, setPortfolioTotalValue] = useState<number>(0);
  const [showTokensOverlay, setShowTokensOverlay] = useState(false);
  const [showActivityOverlay, setShowActivityOverlay] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tokensFetched, setTokensFetched] = useState(false);
  const [transactionsFetched, setTransactionsFetched] = useState(false);

  // Fetch all data on profile load for button visibility
  useEffect(() => {
    if (currentWalletAddress && !dataLoaded) {
      const fetchAllData = async () => {
        setDataLoaded(true);
        
        // Fetch tokens
        try {
          const tokenRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-wallet-portfolio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
            },
            body: JSON.stringify({ walletAddress: currentWalletAddress }),
          });
          const tokenData = await tokenRes.json();
          console.log('Portfolio API response:', tokenData);
          if (tokenData.tokens) setPortfolioTokens(tokenData.tokens);
          if (tokenData.totalValue) setPortfolioTotalValue(tokenData.totalValue);
        } catch (e) { 
          console.error('Token fetch error:', e); 
        } finally {
          setTokensFetched(true);
        }

        // Fetch transactions for Activity button
        try {
          const txRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-wallet-transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
            },
            body: JSON.stringify({ walletAddress: currentWalletAddress }),
          });
          const txData = await txRes.json();
          console.log('Transactions API response:', txData);
          if (txData.transactions) setTransactions(txData.transactions);
        } catch (e) { 
          console.error('Transactions fetch error:', e); 
        } finally {
          setTransactionsFetched(true);
        }

        // Fetch Magic Eden NFTs
        try {
          const meRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-magiceden-nfts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
            },
            body: JSON.stringify({ walletAddress: currentWalletAddress }),
          });
          const meData = await meRes.json();
          if (meData.nfts) setMagicEdenNfts(meData.nfts);
        } catch (e) { console.error('Magic Eden fetch error:', e); }
      };
      fetchAllData();
    }
  }, [currentWalletAddress, dataLoaded]);

  // Fetch Hyperliquid NFTs/tokens from profile data
  useEffect(() => {
    if (web3BioProfile?.hlNfts?.length > 0) setHlNfts(web3BioProfile.hlNfts);
    if (web3BioProfile?.hlTokens?.length > 0) setHlTokens(web3BioProfile.hlTokens);
  }, [web3BioProfile?.hlNfts, web3BioProfile?.hlTokens]);

  // Transactions are now fetched on profile load - no need for overlay-triggered fetch

  // No need to disable body scrolling - parent container handles overflow

  // Get unique collections from NFTs
  const availableCollections = useMemo(() => {
    const collections = new Set(nfts.map(nft => nft.collection || 'Unknown Collection'));
    return Array.from(collections).sort();
  }, [nfts]);

  // Filter NFTs by selected collections (no longer excluding POAPs)
  const filteredNfts = useMemo(() => {
    if (selectedCollections.length === 0) {
      return nfts;
    }
    return nfts.filter(nft => {
      const collection = nft.collection || 'Unknown Collection';
      return selectedCollections.includes(collection);
    });
  }, [nfts, selectedCollections]);

  // Group OpenSea NFTs by collection (excluding POAPs)
  const openSeaGroupedNfts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    // Add regular NFTs (OpenSea only)
    filteredNfts.forEach(nft => {
      const collection = nft.collection || 'Unknown Collection';
      if (!groups[collection]) {
        groups[collection] = [];
      }
      groups[collection].push(nft);
    });

    // Sort collections by NFT count
    return Object.fromEntries(
      Object.entries(groups).sort(([, a], [, b]) => b.length - a.length)
    );
  }, [filteredNfts]);

  // Group Magic Eden NFTs by collection
  const magicEdenGroupedNfts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    magicEdenNfts.forEach(nft => {
      const collection = nft.collection || 'World Chain Collection';
      if (!groups[collection]) {
        groups[collection] = [];
      }
      groups[collection].push(nft);
    });

    // Sort collections by NFT count
    return Object.fromEntries(
      Object.entries(groups).sort(([, a], [, b]) => b.length - a.length)
    );
  }, [magicEdenNfts]);

  // Format POAPs for display
  const formattedPoaps = useMemo(() => {
    return poaps.map(poap => ({
      ...poap,
      collection: 'POAPs',
      name: poap.eventName,
      image_url: poap.eventImageUrl,
      identifier: poap.tokenId,
      isPoap: true,
    }));
  }, [poaps]);

  const handleCollectionToggle = (collection: string) => {
    setSelectedCollections(prev => 
      prev.includes(collection)
        ? prev.filter(c => c !== collection)
        : [...prev, collection]
    );
  };

  // Format collection name: capitalize first letters and remove hyphens
  const formatCollectionName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRarityLabel = (score: number) => {
    if (score >= 80) return { label: 'Legendary', color: 'text-purple-400' };
    if (score >= 60) return { label: 'Epic', color: 'text-blue-400' };
    if (score >= 40) return { label: 'Rare', color: 'text-green-400' };
    if (score >= 20) return { label: 'Uncommon', color: 'text-gray-400' };
    return { label: 'Common', color: 'text-gray-500' };
  };

  const copyAddress = async () => {
    if (currentWalletAddress) {
      await navigator.clipboard.writeText(currentWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCastText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4AF37] hover:underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const extractHandle = (platform: string, url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const handle = pathParts[pathParts.length - 1] || urlObj.hostname;
      
      // Add @ prefix only if handle doesn't already have one
      return handle.startsWith('@') ? handle : `@${handle}`;
    } catch {
      return url; // Fallback to full URL if parsing fails
    }
  };

  return (
    <>
      <div className="w-full h-full flex flex-col">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="flex-1 overflow-hidden">
          <div className="space-y-4 pb-24">
              {/* Header and Avatar - Always visible */}
              <div className="relative flex-shrink-0">
              <div className="w-full aspect-[3/1] lg:aspect-[6/1] overflow-hidden">
                <img
                  src={web3BioProfile?.header || defaultHeader}
                  alt="Header"
                  className="block w-full h-full object-cover"
                />
              </div>

              <div className="flex justify-center absolute -bottom-14 left-0 right-0">
                <div className="relative">
                  <Avatar className="h-40 w-40 border-4 border-background bg-black">
                    <AvatarImage 
                      src={web3BioProfile?.avatar || vanityBoxAvatar} 
                      alt={web3BioProfile?.displayName || 'User'}
                    />
                    <AvatarFallback className="text-6xl bg-[#D4AF37]/10 text-[#D4AF37]">
                      {web3BioProfile?.displayName?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {isWorldIdVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-[#D4AF37] rounded-full p-1 border-2 border-background shadow-lg" title="World ID Verified">
                      <BadgeCheck className="w-5 h-5 text-black" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 pt-16 space-y-2 flex-shrink-0">

              {/* Show searched identity first, then fallback to .hl domain or displayName */}
              <h2 className="text-3xl font-bold text-center text-foreground">
                {searchedIdentity || web3BioProfile?.hlDomain || web3BioProfile?.displayName || (currentWalletAddress ? shortenAddress(currentWalletAddress) : 'Unknown')}
              </h2>
              

              {currentWalletAddress && (
                <div className="flex items-center justify-center">
                  <code 
                    onClick={copyAddress}
                    className="px-3 py-1 bg-muted rounded-md text-sm text-black dark:text-white cursor-pointer hover:bg-muted/80 transition-colors"
                  >
                    {copied ? 'Copied' : shortenAddress(currentWalletAddress)}
                  </code>
                </div>
              )}

              {web3BioProfile?.description && (
                <p className="text-center text-black dark:text-white max-w-2xl mx-auto text-sm">
                  {web3BioProfile.description}
                </p>
              )}

              {/* Following/Followers - Only render container if EFP stats exist with counts > 0 */}
              {efpStats && (efpStats.following_count > 0 || efpStats.followers_count > 0) && (
                <div className="flex justify-center items-center gap-1.5 text-sm">
                  <button
                    onClick={onFollowingClick}
                    className="flex items-center gap-1 hover:opacity-80 transition-colors"
                  >
                    <span className="font-semibold text-[#D4AF37]">{efpStats.following_count || 0}</span>
                    <span className="text-black dark:text-white">Following</span>
                  </button>
                  <span className="text-black dark:text-white">·</span>
                  <button
                    onClick={onFollowersClick}
                    className="flex items-center gap-1 hover:opacity-80 transition-colors"
                  >
                    <span className="font-semibold text-[#D4AF37]">{efpStats.followers_count || 0}</span>
                    <span className="text-black dark:text-white">Followers</span>
                  </button>
                </div>
              )}

              {/* Email/Website - Only show if user has email or website */}
              {web3BioProfile && (web3BioProfile?.email || web3BioProfile?.website || web3BioProfile?.url) && (
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {web3BioProfile?.email && (
                    <a 
                      href={`mailto:${web3BioProfile.email}`} 
                      className="flex items-center gap-2 text-sm text-[#D4AF37] hover:underline"
                    >
                      <Mail className="w-4 h-4 text-black dark:text-white" />
                      {web3BioProfile.email}
                    </a>
                  )}
                  
                  {(web3BioProfile?.website || web3BioProfile?.url) && (
                    <a
                      href={web3BioProfile.website || web3BioProfile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#D4AF37] hover:underline"
                    >
                      <Globe className="w-4 h-4 text-black dark:text-white" />
                      <span>{(web3BioProfile.website || web3BioProfile.url)?.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>
              )}

              {/* Profile Action Buttons - Alphabetical order, show only if data exists */}
              {(() => {
                const socialLinks = web3BioProfile?.links 
                  ? Object.entries(web3BioProfile.links)
                      .filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && platform.toLowerCase() !== 'email' && linkData)
                  : [];
                
                const hasNfts = (nfts && nfts.length > 0) || poaps.length > 0 || magicEdenNfts.length > 0;
                const hasTokens = portfolioTokens.length > 0;
                const hasSocials = socialLinks.length > 0;
                const hasTransactions = transactions.length > 0;

                // Build buttons array for alphabetical sorting
                const buttons: { name: string; onClick: () => void; disabled?: boolean }[] = [];
                
                // Activity button - show if transactions exist
                if (hasTransactions) {
                  buttons.push({ 
                    name: 'Activity', 
                    onClick: () => setShowActivityOverlay(true),
                  });
                }
                
                // NFTs button
                if (hasNfts) {
                  buttons.push({ name: 'NFTs', onClick: () => setShowNftsOverlay(true) });
                }
                
                // Social button
                if (hasSocials) {
                  buttons.push({ name: 'Social', onClick: () => setShowAllSocials(true) });
                }
                
                // Tokens button
                if (hasTokens) {
                  buttons.push({ name: 'Tokens', onClick: () => setShowTokensOverlay(true) });
                }

                // Sort alphabetically
                buttons.sort((a, b) => a.name.localeCompare(b.name));

                if (buttons.length === 0) return null;

                return (
                  <div className="flex items-center justify-center gap-2 min-h-[40px] flex-wrap">
                    {buttons.map((btn) => (
                      <button
                        key={btn.name}
                        onClick={btn.onClick}
                        disabled={btn.disabled}
                        className={`h-10 px-4 flex items-center justify-center rounded-full transition-all shadow-md border ${
                          btn.disabled 
                            ? 'bg-muted/30 border-muted/30 cursor-not-allowed opacity-50' 
                            : 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/40 hover:scale-105 border-[#D4AF37]/30'
                        }`}
                        title={btn.disabled ? 'Coming soon' : `View ${btn.name}`}
                      >
                        <span className={`font-semibold text-sm ${btn.disabled ? 'text-muted-foreground' : 'text-black dark:text-white'}`}>
                          {btn.name}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* On-chain date - Always render with fixed height */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground min-h-[24px]">
                {firstTransactionDate ? (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>
                      On-chain since {new Date(firstTransactionDate).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                        day: 'numeric' 
                      })}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {/* Flip Card for All Social Links */}
            {showAllSocials && (
              <div className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col" style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 50px)' }}>
                {/* Header with ENS image banner */}
                <div 
                  className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
                  style={{ 
                    backgroundImage: `url(${web3BioProfile?.header || defaultHeader})`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
                    <div className="w-10" />
                    <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
                      <h3 className="text-lg font-bold text-black dark:text-white">Social Links</h3>
                    </div>
                    <button
                      onClick={() => setShowAllSocials(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 text-black dark:text-white" />
                    </button>
                  </div>
                </div>

                {/* Social Icons Grid */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                    {web3BioProfile?.links && Object.entries(web3BioProfile.links)
                      .filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && platform.toLowerCase() !== 'email' && linkData)
                      .map(([platform, linkData]: [string, any]) => {
                        const url = typeof linkData === 'string' ? linkData : linkData?.link;
                        if (!url) return null;

                        return (
                          <a 
                            key={platform} 
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all border border-border/30 hover:border-[#D4AF37]/50"
                          >
                            <SocialIcon
                              platform={platform}
                              url={url}
                              size="lg"
                            />
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-sm text-foreground font-medium text-center">
                                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-[100px] text-center">
                                {extractHandle(platform, url)}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* NFTs Overlay - Fits within gold borders */}
            {showNftsOverlay && (
              <div className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col" style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 50px)' }}>
                {/* Header with ENS image banner */}
                <div 
                  className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
                  style={{ 
                    backgroundImage: `url(${web3BioProfile?.header || defaultHeader})`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
                    <div className="w-10" />
                    <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
                      <h3 className="text-lg font-bold text-black dark:text-white">
                        {nftCategory === 'main' ? 'NFTs' : nftCategory === 'poaps' ? 'POAPs' : nftCategory === 'opensea' ? 'OpenSea' : nftCategory === 'magiceden' ? 'EVM' : 'Hyperliquid'}
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        if (nftCategory !== 'main' && !expandedCollection) {
                          setNftCategory('main');
                        } else if (expandedCollection) {
                          setExpandedCollection(null);
                        } else {
                          setShowNftsOverlay(false);
                          setNftCategory('main');
                        }
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 text-black dark:text-white" />
                    </button>
                  </div>
                </div>

                {/* NFTs Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
                  {nftCategory === 'main' ? (
                    // Main category selection
                    <div className="space-y-2 max-w-lg mx-auto">
                      {/* POAPs Button */}
                      <button
                        onClick={() => setNftCategory('poaps')}
                        className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                      >
                        <div className="flex items-center justify-between h-full">
                          <div className="text-left flex-1 min-w-0 mr-3">
                            <h4 className="font-medium text-black text-base">POAPs</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-black/70">{poaps.length} {poaps.length === 1 ? 'item' : 'items'}</p>
                              <div className="flex -space-x-2">
                                {poaps.slice(0, 3).map((poap, idx) => (
                                  <img key={idx} src={poap.eventImageUrl} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                        </div>
                      </button>

                      {/* OpenSea Button */}
                      <button
                        onClick={() => setNftCategory('opensea')}
                        className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                      >
                        <div className="flex items-center justify-between h-full">
                          <div className="text-left flex-1 min-w-0 mr-3">
                            <h4 className="font-medium text-black text-base">OpenSea</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-black/70">{nfts.length} {nfts.length === 1 ? 'item' : 'items'}</p>
                              <div className="flex -space-x-2">
                                {nfts.slice(0, 3).map((nft, idx) => (
                                  <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                        </div>
                      </button>

                      {/* Magic Eden (EVM) Button */}
                      <button
                        onClick={() => setNftCategory('magiceden')}
                        className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                      >
                        <div className="flex items-center justify-between h-full">
                          <div className="text-left flex-1 min-w-0 mr-3">
                            <h4 className="font-medium text-black text-base">EVM</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-black/70">{magicEdenNfts.length} {magicEdenNfts.length === 1 ? 'item' : 'items'}</p>
                              {magicEdenNfts.length > 0 && (
                                <div className="flex -space-x-2">
                                  {magicEdenNfts.slice(0, 3).map((nft, idx) => (
                                    <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                        </div>
                      </button>

                      {/* Hyperliquid Button - Only show if .hl domain or has HL NFTs */}
                      {(web3BioProfile?.hlDomain || hlNfts.length > 0) && (
                        <button
                          onClick={() => setNftCategory('hyperliquid')}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base">Hyperliquid</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-black/70">{hlNfts.length} {hlNfts.length === 1 ? 'item' : 'items'}</p>
                                {hlNfts.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {hlNfts.slice(0, 3).map((nft, idx) => (
                                      <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}
                    </div>
                  ) : nftCategory === 'poaps' ? (
                    // POAPs grid
                    <div className="space-y-4 max-w-2xl mx-auto">
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                        {formattedPoaps.map((poap, index) => (
                          <div
                            key={`poap-${poap.identifier}-${index}`}
                            className="group cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setSelectedPoap(poap)}
                          >
                            <img src={poap.image_url} alt={poap.name} className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : nftCategory === 'opensea' ? (
                    // OpenSea collections
                    expandedCollection ? (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="sticky -top-3 z-10 bg-background dark:bg-black -mx-4 px-4 pt-3 pb-3">
                          <div className="flex items-center gap-3 pb-3 border-b border-[#D4AF37]/30">
                            <button onClick={() => setExpandedCollection(null)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] transition-colors">
                              <ChevronDown className="w-4 h-4 rotate-90" />
                              <span className="text-sm font-medium">Back</span>
                            </button>
                            <div className="flex-1">
                              <h4 className="font-bold text-[#D4AF37] text-lg truncate">{formatCollectionName(expandedCollection)}</h4>
                              <p className="text-sm text-muted-foreground">{openSeaGroupedNfts[expandedCollection]?.length || 0} items</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                          {openSeaGroupedNfts[expandedCollection]?.map((nft: any, index: number) => {
                            const animationUrl = nft.animation_url || nft.metadata?.animation_url;
                            const isVideo = animationUrl && (animationUrl.toLowerCase().includes('.mp4') || animationUrl.toLowerCase().includes('.webm') || animationUrl.toLowerCase().includes('video'));
                            const isAudio = animationUrl && (animationUrl.toLowerCase().includes('.mp3') || animationUrl.toLowerCase().includes('.wav') || animationUrl.toLowerCase().includes('audio'));
                            return (
                              <div key={`${nft.contract}-${nft.identifier}-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                                {isVideo ? (
                                  <video src={animationUrl} poster={nft.image_url || nft.display_image_url} muted loop playsInline onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} className="w-full aspect-square object-cover" />
                                ) : (
                                  <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                                )}
                                {nft.quantity && nft.quantity > 1 && <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">x{nft.quantity}</div>}
                                {(isVideo || isAudio) && <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">{isVideo ? '▶' : '♪'}</div>}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                  <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-lg mx-auto">
                        {Object.entries(openSeaGroupedNfts).map(([collection, collectionNfts]: [string, any[]]) => (
                          <button key={collection} onClick={() => setExpandedCollection(collection)} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation">
                            <div className="flex items-center justify-between h-full">
                              <div className="text-left flex-1 min-w-0 mr-3">
                                <h4 className="font-medium text-black text-base truncate">{formatCollectionName(collection)}</h4>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-black/70">{collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}</p>
                                  <div className="flex -space-x-2">
                                    {collectionNfts.slice(0, 3).map((nft: any, idx: number) => (
                                      <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                        {web3BioProfile?.address && (
                          <Button asChild className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 mt-3">
                            <a href={`https://opensea.io/${web3BioProfile.address}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />View On OpenSea
                            </a>
                          </Button>
                        )}
                      </div>
                    )
                  ) : nftCategory === 'magiceden' ? (
                    // Magic Eden collections
                    magicEdenLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                      </div>
                    ) : expandedCollection ? (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="sticky -top-3 z-10 bg-background dark:bg-black -mx-4 px-4 pt-3 pb-3">
                          <div className="flex items-center gap-3 pb-3 border-b border-[#D4AF37]/30">
                            <button onClick={() => setExpandedCollection(null)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] transition-colors">
                              <ChevronDown className="w-4 h-4 rotate-90" />
                              <span className="text-sm font-medium">Back</span>
                            </button>
                            <div className="flex-1">
                              <h4 className="font-bold text-[#D4AF37] text-lg truncate">{formatCollectionName(expandedCollection)}</h4>
                              <p className="text-sm text-muted-foreground">{magicEdenGroupedNfts[expandedCollection]?.length || 0} items</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                          {magicEdenGroupedNfts[expandedCollection]?.map((nft: any, index: number) => (
                            <div key={`${nft.contract}-${nft.identifier}-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                              <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                              {nft.quantity && nft.quantity > 1 && <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">x{nft.quantity}</div>}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : magicEdenNfts.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No Magic Eden NFTs found</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-lg mx-auto">
                        {Object.entries(magicEdenGroupedNfts).map(([collection, collectionNfts]: [string, any[]]) => (
                          <button key={collection} onClick={() => setExpandedCollection(collection)} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation">
                            <div className="flex items-center justify-between h-full">
                              <div className="text-left flex-1 min-w-0 mr-3">
                                <h4 className="font-medium text-black text-base truncate">{formatCollectionName(collection)}</h4>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-black/70">{collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}</p>
                                  <div className="flex -space-x-2">
                                    {collectionNfts.slice(0, 3).map((nft: any, idx: number) => (
                                      <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                        {web3BioProfile?.address && (
                          <Button asChild className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 mt-3">
                            <a href={`https://magiceden.io/portfolio/${web3BioProfile.address}?chain=worldchain`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />View On Magic Eden
                            </a>
                          </Button>
                        )}
                      </div>
                    )
                  ) : nftCategory === 'hyperliquid' ? (
                    // Hyperliquid NFTs
                    hlLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                      </div>
                    ) : hlNfts.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No Hyperliquid NFTs found</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                          {hlNfts.map((nft: any, index: number) => (
                            <div key={`hl-${nft.identifier || nft.contract}-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                              <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                              {nft.quantity && nft.quantity > 1 && <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">x{nft.quantity}</div>}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            )}

            {/* Tokens Overlay */}
            {showTokensOverlay && (
              <div className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col" style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 50px)' }}>
                {/* Header with ENS image banner */}
                <div 
                  className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
                  style={{ 
                    backgroundImage: `url(${web3BioProfile?.header || defaultHeader})`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
                    <div className="w-10" />
                    <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
                      <h3 className="text-lg font-bold text-black dark:text-white">Tokens</h3>
                    </div>
                    <button
                      onClick={() => setShowTokensOverlay(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 text-black dark:text-white" />
                    </button>
                  </div>
                </div>

                {/* Tokens Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
                  {portfolioLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                    </div>
                  ) : portfolioTokens.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg">No tokens found</p>
                      <p className="text-sm mt-2">This wallet doesn't have any tokens with value</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-lg mx-auto">
                      {/* Portfolio Total Value */}
                      {portfolioTotalValue > 0 && (
                        <div className="text-center mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20">
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-2xl font-bold text-[#D4AF37]">${portfolioTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      )}
                      
                      {/* Token List */}
                      {portfolioTokens.map((token: any, index: number) => (
                        <div 
                          key={token.id || `token-${index}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-border/30 hover:border-[#D4AF37]/30 transition-all"
                        >
                          {token.icon ? (
                            <img src={token.icon} alt={token.symbol} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold">
                              {token.symbol?.slice(0, 2) || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground truncate">{token.name}</span>
                              <span className="text-sm font-semibold text-foreground">${token.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{token.quantity?.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}</span>
                              {token.priceChange24h !== 0 && (
                                <span className={token.priceChange24h > 0 ? 'text-green-500' : 'text-red-500'}>
                                  {token.priceChange24h > 0 ? '+' : ''}{(token.priceChange24h * 100).toFixed(2)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Overlay */}
            {showActivityOverlay && (
              <div className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col" style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 50px)' }}>
                {/* Header */}
                <div 
                  className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundImage: `url(${web3BioProfile?.header || defaultHeader})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
                    <div className="w-10" />
                    <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
                      <h3 className="text-lg font-bold text-black dark:text-white">Activity</h3>
                    </div>
                    <button
                      onClick={() => setShowActivityOverlay(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 text-black dark:text-white" />
                    </button>
                  </div>
                </div>

                {/* Activity Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg">No transactions found</p>
                      <p className="text-sm mt-2">Transaction history coming soon</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-lg mx-auto">
                      {transactions.map((tx: any, index: number) => (
                        <div 
                          key={tx.id || `tx-${index}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-border/30 hover:border-[#D4AF37]/30 transition-all"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            <span className="text-lg">{tx.type === 'receive' ? '↓' : '↑'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground truncate capitalize">{tx.type || 'Transaction'}</span>
                              <span className="text-xs text-muted-foreground">
                                {tx.minedAt ? formatDistanceToNow(new Date(tx.minedAt), { addSuffix: true }) : ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span className="truncate">{tx.hash?.slice(0, 10)}...</span>
                              <span className="text-xs uppercase">{tx.chain}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Socials Section */}
        {activeSection === 'socials' && (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 pb-24">
            <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h3 className="text-2xl font-bold text-[#D4AF37]">Social Links</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {web3BioProfile?.links && Object.entries(web3BioProfile.links)
                .filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && linkData)
                .map(([platform, linkData]: [string, any]) => {
                  const displayLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
                  const url = typeof linkData === 'string' ? linkData : linkData?.link;
                  const handle = typeof linkData === 'string' ? extractHandle(platform, linkData) : linkData?.handle;
                  
                  if (!url) return null;
                  
                  return (
                    <button
                      key={platform}
                      onClick={() => window.open(url, '_blank')}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/30 hover:border-[#D4AF37]/50 bg-card/30 hover:bg-card/50 transition-colors active:opacity-90 group touch-action-manipulation flex-shrink-0"
                    >
                      <SocialIcon
                        platform={platform}
                        url={url}
                        size="md"
                        onClick={() => window.open(url, '_blank')}
                      />
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-base text-foreground group-hover:text-[#D4AF37] transition-colors">
                          {displayLabel}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {handle || extractHandle(platform, url)}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-[#D4AF37] transition-colors flex-shrink-0" />
                    </button>
                  );
                })}
            </div>

            {(!web3BioProfile?.links || Object.keys(web3BioProfile.links).length === 0) && (
              <div className="text-center py-12 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30">
                <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-base">No social links configured</p>
              </div>
            )}
            </div>
            </div>
          </div>
        )}

        {/* NFTs Section - Only show if user has NFTs or POAPs */}
        {activeSection === 'nfts' && (nfts.length > 0 || poaps.length > 0 || nftLoading) && (
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4 border-b border-border/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {availableCollections.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="border-border/50 bg-background/60 hover:bg-background/80 hover:border-[#D4AF37]/50 transition-colors h-10 w-10 rounded-xl">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14"></line>
                            <line x1="4" y1="10" x2="4" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12" y2="3"></line>
                            <line x1="20" y1="21" x2="20" y2="16"></line>
                            <line x1="20" y1="12" x2="20" y2="3"></line>
                            <line x1="2" y1="14" x2="6" y2="14"></line>
                            <line x1="10" y1="8" x2="14" y2="8"></line>
                            <line x1="18" y1="16" x2="22" y2="16"></line>
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72 bg-background/95 backdrop-blur-xl border-border/50 max-h-80 overflow-y-auto">
                        {availableCollections.map(collection => (
                          <DropdownMenuCheckboxItem
                            key={collection}
                            checked={selectedCollections.includes(collection)}
                            onCheckedChange={() => handleCollectionToggle(collection)}
                            className="hover:bg-[#D4AF37]/10 cursor-pointer"
                          >
                            <span className="font-medium">{formatCollectionName(collection)}</span>
                          </DropdownMenuCheckboxItem>
                        ))}
                        {selectedCollections.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setSelectedCollections([])}
                              className="text-[#D4AF37] hover:bg-[#D4AF37]/10 cursor-pointer font-medium"
                            >
                              Clear all filters
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <h3 className="text-2xl font-bold text-[#D4AF37]">NFTs</h3>
                </div>

                {availableCollections.length > 1 && selectedCollections.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCollections.map(collection => (
                      <Badge
                        key={collection}
                        variant="secondary"
                        className="cursor-pointer bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 transition-colors font-medium px-3 py-1"
                        onClick={() => handleCollectionToggle(collection)}
                      >
                        {formatCollectionName(collection)} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {nfts.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30">
                  <div className="relative inline-block mb-4">
                    <div className="text-7xl opacity-30">🖼️</div>
                    <div className="absolute inset-0 bg-[#D4AF37]/10 blur-2xl"></div>
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">No NFTs Found</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    This wallet doesn't have any NFTs yet on supported chains
                  </p>
                </div>
              ) : filteredNfts.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30">
                  <div className="relative inline-block mb-4">
                    <div className="text-7xl opacity-30">🔍</div>
                    <div className="absolute inset-0 bg-[#D4AF37]/10 blur-2xl"></div>
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">No Matches Found</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                    No NFTs match your current filter criteria
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedCollections([])}
                    className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                <>
                  {expandedCollection ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedCollection(null)}
                          className="text-[#D4AF37] hover:text-[#D4AF37]/80 hover:bg-[#D4AF37]/10"
                        >
                          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                          Back to Collections
                        </Button>
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground text-lg">{formatCollectionName(expandedCollection)}</h4>
                          <p className="text-xs text-muted-foreground">
                            {openSeaGroupedNfts[expandedCollection]?.length || 0} items
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {openSeaGroupedNfts[expandedCollection]?.map((nft: any, index: number) => (
                          <div
                            key={`${nft.contract}-${nft.identifier}-${index}`}
                            className="group relative overflow-hidden rounded-xl cursor-pointer active:opacity-90 transition-opacity flex-shrink-0 touch-action-manipulation"
                            onClick={() => setSelectedNft(nft)}
                          >
                            <div className="aspect-square relative overflow-hidden bg-black/20">
                              {nft.image_url ? (
                                <img
                                  src={nft.image_url}
                                  alt={nft.name || 'NFT'}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                  <div className="text-4xl opacity-40">🖼️</div>
                                </div>
                              )}
                              
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-[background-color,opacity] duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="text-white text-sm font-semibold">View Details</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 px-2">
                      {Object.entries(openSeaGroupedNfts).map(([collection, collectionNfts]: [string, any[]]) => (
                        <button
                          key={collection}
                          onClick={() => setExpandedCollection(collection)}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation flex-shrink-0"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base truncate">
                                {formatCollectionName(collection)}
                              </h4>
                              <p className="text-sm text-[#D4AF37]">
                                {collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {web3BioProfile?.address && !expandedCollection && nfts.length > 0 && (
              <div className="p-4 border-t border-border/30">
                <Button
                  asChild
                  className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                >
                  <a
                    href={`https://opensea.io/${web3BioProfile.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View On OpenSea
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Farcaster Section */}
        {activeSection === 'farcaster' && (
          <div className="flex-1 overflow-y-auto" style={{ minHeight: '400px' }}>
            <div className="space-y-4 pb-24">
            <div className="p-6">
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">📰 Farcaster Feed</h3>
            <div>{/* Removed max-h and overflow-y-auto */}
              {castLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !latestCast ? (
                <div className="text-center py-8 text-muted-foreground">No Farcaster activity found</div>
              ) : (
                <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                  <div className="flex gap-3">
                    <Avatar className="h-12 w-12 border-2 border-[#D4AF37]/20">
                      <AvatarImage src={latestCast.author.pfp_url} alt={latestCast.author.display_name} />
                      <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37]">
                        {latestCast.author.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {latestCast.author.display_name}
                            </span>
                            {latestCast.channel && (
                              <Badge variant="outline" className="text-xs border-[#D4AF37]/30 text-muted-foreground">
                                /{latestCast.channel.id}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            @{latestCast.author.username} · {formatDistanceToNow(new Date(latestCast.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <a
                          href={`https://warpcast.com/${latestCast.author.username}/${latestCast.hash.slice(0, 10)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-[#D4AF37] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      <p className="text-foreground whitespace-pre-wrap mb-3 leading-relaxed">
                        {formatCastText(latestCast.text)}
                      </p>

                      {latestCast.embeds.length > 0 && (() => {
                        const imageEmbed = latestCast.embeds.find(e => e?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                        const videoEmbed = latestCast.embeds.find(e => e?.url?.match(/\.(mp4|webm|mov)$/i));
                        
                        if (imageEmbed) {
                          return (
                            <div className="mb-3 rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                              <img
                                src={imageEmbed.url}
                                alt="Cast media"
                                className="w-full max-h-[500px] object-contain bg-black/20"
                                loading="lazy"
                              />
                            </div>
                          );
                        }
                        
                        if (videoEmbed) {
                          return (
                            <div className="mb-3 rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                              <video
                                src={videoEmbed.url}
                                controls
                                className="w-full max-h-[500px] bg-black/20"
                                playsInline
                              />
                            </div>
                          );
                        }
                        
                        return null;
                      })()}

                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4" />
                          <span>{latestCast.replies.count}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Repeat2 className="w-4 h-4" />
                          <span>{latestCast.reactions.recasts_count}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4" />
                          <span>{latestCast.reactions.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
            </div>
            </div>
          </div>
        )}
      </div>

      {selectedPoap && (
        <PoapDetailModal
          poap={selectedPoap}
          isOpen={!!selectedPoap}
          onClose={() => setSelectedPoap(null)}
        />
      )}

      {selectedNft && (
        <NFTDetailModal
          nft={selectedNft}
          isOpen={!!selectedNft}
          onClose={() => setSelectedNft(null)}
        />
      )}
    </>
  );
};
