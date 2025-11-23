import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, MessageCircle, Repeat2, Heart, Loader2, Search, Filter, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { PoapDetailModal } from "./PoapDetailModal";
import { NFTDetailModal } from "./NFTDetailModal";
import { formatDistanceToNow } from "date-fns";
import type { FarcasterCast } from "@/types/farcaster";
import defaultHeader from '@/assets/default-header-pattern.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

interface ProfileCardProps {
  activeSection: 'profile' | 'socials' | 'poaps' | 'nfts' | 'farcaster';
  web3BioProfile?: any;
  currentWalletAddress?: string;
  efpStats?: any;
  poaps?: any[];
  socialIcons?: Record<string, string>;
  nfts?: any[];
  nftLoading?: boolean;
  nftNextCursor?: string | null;
  latestCast?: FarcasterCast | null;
  castLoading?: boolean;
  firstTransactionDate?: string | null;
  onFollowingClick?: () => void;
  onLoadMoreNfts?: () => void;
}

export const ProfileCard = ({
  activeSection,
  web3BioProfile,
  currentWalletAddress,
  efpStats,
  poaps = [],
  socialIcons = {},
  nfts = [],
  nftLoading = false,
  nftNextCursor = null,
  latestCast = null,
  castLoading = false,
  firstTransactionDate = null,
  onFollowingClick,
  onLoadMoreNfts,
}: ProfileCardProps) => {
  const [copied, setCopied] = useState(false);
  const [selectedPoap, setSelectedPoap] = useState<any>(null);
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // Disable body scrolling when profile card is displayed
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Get unique collections from NFTs
  const availableCollections = useMemo(() => {
    const collections = new Set(nfts.map(nft => nft.collection || 'Unknown Collection'));
    return Array.from(collections).sort();
  }, [nfts]);

  // Filter NFTs by selected collections
  const filteredNfts = useMemo(() => {
    if (selectedCollections.length === 0) {
      return nfts;
    }
    return nfts.filter(nft => {
      const collection = nft.collection || 'Unknown Collection';
      return selectedCollections.includes(collection);
    });
  }, [nfts, selectedCollections]);

  // Group NFTs by collection
  const groupedNfts = useMemo(() => {
    const groups: Record<string, any[]> = {};
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
      
      // Platforms that use @ prefix
      const atPlatforms = ['twitter', 'x', 'instagram', 'threads', 'bluesky'];
      
      if (atPlatforms.includes(platform.toLowerCase())) {
        return `@${handle}`;
      }
      
      return handle;
    } catch {
      return url; // Fallback to full URL if parsing fails
    }
  };

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden relative z-[10000]">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pb-32">
            <div className="relative">
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={web3BioProfile?.header || defaultHeader}
                  alt="Header"
                  className="w-full h-full object-cover"
                />
              </div>

              {web3BioProfile?.avatar && (
                <div className="flex justify-center absolute -bottom-24 left-0 right-0">
                  <Avatar className="h-48 w-48 border-4 border-background">
                    <AvatarImage src={web3BioProfile.avatar} alt={web3BioProfile.displayName} />
                    <AvatarFallback className="text-6xl bg-[#D4AF37]/10 text-[#D4AF37]">
                      {web3BioProfile.displayName?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            <div className="p-6 pt-28 space-y-4">

              {web3BioProfile?.displayName && (
                <h2 className="text-3xl font-bold text-center text-foreground">
                  {web3BioProfile.displayName}
                </h2>
              )}

              {currentWalletAddress && (
                <div className="flex items-center justify-center gap-2">
                  <code className="px-3 py-1 bg-muted rounded-md text-sm text-muted-foreground">
                    {shortenAddress(currentWalletAddress)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyAddress}
                    className="h-8 w-8"
                  >
                    <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              )}

              {web3BioProfile?.description && (
                <p className="text-center text-muted-foreground max-w-2xl mx-auto">
                  {web3BioProfile.description}
                </p>
              )}

              {efpStats && (
                <div className="flex justify-center gap-6">
                  <button
                    onClick={onFollowingClick}
                    className="text-center hover:opacity-80 transition-opacity"
                  >
                    <div className="text-2xl font-bold text-[#D4AF37]">
                      {efpStats.following_count}
                    </div>
                    <div className="text-sm text-muted-foreground">Following</div>
                  </button>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#D4AF37]">
                      {efpStats.followers_count}
                    </div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                  </div>
                </div>
              )}

              {web3BioProfile?.email && (
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Email: </span>
                  <a href={`mailto:${web3BioProfile.email}`} className="text-sm text-[#D4AF37] hover:underline">
                    {web3BioProfile.email}
                  </a>
                </div>
              )}

              {(web3BioProfile?.website || web3BioProfile?.url) && (
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Website: </span>
                  <a
                    href={web3BioProfile.website || web3BioProfile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#D4AF37] hover:underline"
                  >
                    {(web3BioProfile.website || web3BioProfile.url)?.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}

              {web3BioProfile?.location && (
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Location: </span>
                  <span className="text-sm text-[#D4AF37]">{web3BioProfile.location}</span>
                </div>
              )}

              {firstTransactionDate && (
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Date Joined: </span>
                  <span className="text-sm text-[#D4AF37]">
                    {new Date(firstTransactionDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Socials Section */}
        {activeSection === 'socials' && (
          <div className="p-6 pb-32">
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">🔗 Social Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {web3BioProfile?.links && Object.entries(web3BioProfile.links)
                .filter(([platform, url]) => {
                  if (!url) return false;
                  const websiteKeys = ['website', 'url', 'homepage'];
                  return !websiteKeys.includes(platform.toLowerCase());
                }).length > 0 ? (
                Object.entries(web3BioProfile.links)
                  .filter(([platform, url]) => {
                    if (!url) return false;
                    const websiteKeys = ['website', 'url', 'homepage'];
                    return !websiteKeys.includes(platform.toLowerCase());
                  })
                  .map(([platform, url]: [string, any]) => {
                    const link = typeof url === 'string' ? url : url?.link || '';
                    if (!link) return null;
                    
                    return (
                      <Card
                        key={platform}
                        className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300"
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 group"
                        >
                          {socialIcons[platform.toLowerCase()] && (
                            <img
                              src={socialIcons[platform.toLowerCase()]}
                              alt={platform}
                              className="w-8 h-8 rounded-full border border-[#D4AF37]/20"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground capitalize">{platform}</div>
                            <div className="text-xs text-[#D4AF37] truncate">{extractHandle(platform, link)}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </Card>
                    );
                  })
              ) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No social links available
                </div>
              )}
            </div>
          </div>
        )}

        {/* POAPs Section */}
        {activeSection === 'poaps' && (
          <div className="p-6 pb-32">
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">🏅 POAPs</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
              {poaps.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No POAPs found
                </div>
              ) : (
                poaps.map((poap) => (
                  <Card
                    key={poap.tokenId}
                    className="p-3 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedPoap(poap)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-[#D4AF37]/20 mb-2">
                      <img
                        src={poap.eventImageUrl}
                        alt={poap.eventName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs font-semibold text-foreground text-center truncate">
                      {poap.eventName}
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {poap.eventYear}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* NFTs Section */}
        {activeSection === 'nfts' && (
          <div className="p-6 pb-32">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl font-bold text-[#D4AF37]">🎨 NFT Collection</h3>
                  {nfts.length > 0 && (
                    <Badge variant="secondary" className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 text-sm font-semibold">
                      {nfts.length} {nfts.length === 1 ? 'NFT' : 'NFTs'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Collection Filter */}
              {availableCollections.length > 1 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="border-border/50 bg-background/60 hover:bg-background/80 hover:border-[#D4AF37]/50 transition-all h-10 rounded-xl">
                        <span className="mr-2">📚</span>
                        <span className="font-medium">Collections</span>
                        {selectedCollections.length > 0 && (
                          <Badge variant="secondary" className="ml-2 bg-[#D4AF37]/20 text-[#D4AF37] border-0 px-1.5 py-0 text-xs">
                            {selectedCollections.length}
                          </Badge>
                        )}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72 bg-background/95 backdrop-blur-xl border-border/50 max-h-96 overflow-y-auto">
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

                  {/* Active Filter Badges */}
                  {selectedCollections.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedCollections.map(collection => (
                        <Badge
                          key={collection}
                          variant="secondary"
                          className="cursor-pointer bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 transition-all font-medium px-3 py-1"
                          onClick={() => handleCollectionToggle(collection)}
                        >
                          {formatCollectionName(collection)} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              {nftLoading && nfts.length === 0 ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center py-8 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30">
                    <div className="relative inline-block">
                      <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-3" />
                      <div className="absolute inset-0 w-12 h-12 bg-[#D4AF37]/20 blur-xl animate-pulse"></div>
                    </div>
                    <p className="text-base font-medium text-foreground mb-1">Loading NFT Collection</p>
                    <p className="text-sm text-muted-foreground">Scanning multiple chains...</p>
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                      {['Ethereum', 'Polygon', 'Base', 'Arbitrum', 'Optimism'].map((chain, i) => (
                        <Badge 
                          key={chain} 
                          variant="outline" 
                          className="text-xs border-border/40 bg-background/40 animate-pulse"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        >
                          {chain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...Array(12)].map((_, i) => (
                      <Card 
                        key={i} 
                        className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/40 animate-pulse"
                        style={{ animationDelay: `${i * 0.05}s` }}
                      >
                        <Skeleton className="aspect-square rounded-none bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5" />
                        <div className="p-3 space-y-2">
                          <Skeleton className="h-4 w-3/4 bg-[#D4AF37]/10 rounded-md" />
                          <Skeleton className="h-3 w-1/2 bg-[#D4AF37]/10 rounded-md" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : nfts.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30 animate-fade-in">
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
                <div className="text-center py-16 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30 animate-fade-in">
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
                  <div className="max-h-[60vh] overflow-y-auto space-y-8 pr-2">
                    {Object.entries(groupedNfts).map(([collection, collectionNfts]) => (
                      <div key={collection} className="animate-fade-in">
                        <div className="mb-5 pb-4 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-card/40 to-transparent -mx-2 px-2 py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
                              <span className="text-xl">📦</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground text-base">{formatCollectionName(collection)}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          </div>
                          {collectionNfts[0]?.floor_price && (
                            <div className="text-right bg-[#D4AF37]/5 px-4 py-2 rounded-lg border border-[#D4AF37]/20">
                              <p className="text-xs text-muted-foreground">Floor Price</p>
                              <p className="text-sm font-bold text-[#D4AF37] flex items-center gap-1">
                                <span>💎</span> {collectionNfts[0].floor_price} ETH
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {collectionNfts.map((nft: any, index: number) => {
                            const rarity = nft.rarity_score ? getRarityLabel(nft.rarity_score) : null;
                            
                            return (
                              <Card
                                key={`${nft.contract}-${nft.identifier}-${index}`}
                                className="group relative overflow-hidden bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/60 hover:shadow-2xl hover:shadow-[#D4AF37]/20 transition-all duration-500 cursor-pointer hover:-translate-y-1"
                                onClick={() => setSelectedNft(nft)}
                              >
                                {/* Rarity Badge */}
                                {rarity && (
                                  <div className="absolute top-2.5 left-2.5 z-10">
                                    <Badge 
                                      variant="secondary" 
                                      className={`${rarity.color} bg-black/70 backdrop-blur-md border-0 text-xs font-bold px-2.5 py-1 shadow-lg`}
                                    >
                                      ⭐ {rarity.label}
                                    </Badge>
                                  </div>
                                )}

                                {/* Chain Badge */}
                                {nft.chain && (
                                  <div className="absolute top-2.5 right-2.5 z-10">
                                    <Badge 
                                      variant="outline" 
                                      className="bg-black/70 backdrop-blur-md border-white/20 text-white text-xs capitalize px-2.5 py-1 font-semibold shadow-lg"
                                    >
                                      {nft.chain}
                                    </Badge>
                                  </div>
                                )}

                                {/* NFT Image */}
                                <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-black/30 to-black/50">
                                  {nft.image_url ? (
                                    <img
                                      src={nft.image_url}
                                      alt={nft.name || 'NFT'}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                                      <div className="text-center">
                                        <div className="text-5xl mb-2 opacity-40">🖼️</div>
                                        <p className="text-xs text-muted-foreground font-medium">No Preview</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Hover Overlay with Gradient */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-4">
                                    <Button 
                                      size="sm" 
                                      variant="secondary"
                                      className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] hover:from-[#B8941F] hover:to-[#D4AF37] text-black font-bold shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedNft(nft);
                                      }}
                                    >
                                      View Details
                                    </Button>
                                  </div>
                                </div>

                                {/* NFT Info */}
                                <div className="p-4 space-y-2.5 bg-gradient-to-b from-card/80 to-card/60">
                                  <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground truncate leading-tight">
                                      {nft.name || `#${nft.identifier}`}
                                    </p>
                                  </div>

                                  {/* Price and Rarity Score */}
                                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                    {nft.floor_price ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Floor</span>
                                        <span className="text-sm font-bold text-[#D4AF37] flex items-center gap-1">
                                          💎 {nft.floor_price} ETH
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground font-mono">#{nft.identifier}</span>
                                    )}
                                    
                                    {nft.rarity_score > 0 && (
                                      <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Rarity</span>
                                        <span className={`text-sm font-bold ${rarity?.color || 'text-foreground'}`}>
                                          {nft.rarity_score}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {nftNextCursor && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={onLoadMoreNfts}
                        disabled={nftLoading}
                        className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                      >
                        {nftLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Farcaster Section */}
        {activeSection === 'farcaster' && (
          <div className="p-6 pb-32">
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">📰 Farcaster Feed</h3>
            <div className="max-h-[60vh] overflow-y-auto">
              {castLoading ? (
                <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                  <div className="flex gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </Card>
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
        )}
      </Card>

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
