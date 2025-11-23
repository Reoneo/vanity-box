import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, MessageCircle, Repeat2, Heart, Loader2, Search, Filter, ChevronDown, Link2, Globe, Mail, Activity } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { PoapDetailModal } from "./PoapDetailModal";
import { NFTDetailModal } from "./NFTDetailModal";
import { ActivityGraph } from "./ActivityGraph";
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
  activeSection: 'profile' | 'socials' | 'nfts' | 'farcaster' | 'activity';
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
  onFollowersClick?: () => void;
  onLoadMoreNfts?: () => void;
  transactions?: any;
  transactionsLoading?: boolean;
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
  onFollowersClick,
  onLoadMoreNfts,
  transactions,
  transactionsLoading = false,
}: ProfileCardProps) => {
  const [copied, setCopied] = useState(false);
  const [selectedPoap, setSelectedPoap] = useState<any>(null);
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);

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

  // Group NFTs by collection, including POAPs as a collection
  const groupedNfts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    // Add POAPs as a collection if there are any
    if (poaps && poaps.length > 0) {
      groups['POAPs'] = poaps.map(poap => ({
        ...poap,
        collection: 'POAPs',
        name: poap.eventName,
        image_url: poap.eventImageUrl,
        identifier: poap.tokenId,
        isPoap: true,
      }));
    }
    
    // Add regular NFTs
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
      <Card className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden relative z-[9999]">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pb-6">
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
                <div className="flex items-center justify-center">
                  <code 
                    onClick={copyAddress}
                    className="px-3 py-1 bg-muted rounded-md text-sm text-[#D4AF37] cursor-pointer hover:bg-muted/80 transition-colors"
                  >
                    {copied ? 'Copied' : shortenAddress(currentWalletAddress)}
                  </code>
                </div>
              )}

              {web3BioProfile?.description && (
                <p className="text-center text-muted-foreground max-w-2xl mx-auto">
                  {web3BioProfile.description}
                </p>
              )}

              {efpStats && (
                <div className="flex justify-center items-center gap-1.5 text-sm">
                  <button
                    onClick={onFollowingClick}
                    className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors"
                  >
                    <span className="font-semibold text-foreground">{efpStats.following_count}</span>
                    <span className="text-muted-foreground">Following</span>
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    onClick={onFollowersClick}
                    className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors"
                  >
                    <span className="font-semibold text-foreground">{efpStats.followers_count}</span>
                    <span className="text-muted-foreground">Followers</span>
                  </button>
                </div>
              )}

              {(web3BioProfile?.email || web3BioProfile?.website || web3BioProfile?.url) && (
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {web3BioProfile?.email && (
                    <a 
                      href={`mailto:${web3BioProfile.email}`} 
                      className="flex items-center gap-2 text-sm text-[#D4AF37] hover:underline"
                    >
                      <Mail className="w-4 h-4" />
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
                      <Globe className="w-4 h-4" />
                      {(web3BioProfile.website || web3BioProfile.url)?.replace(/^https?:\/\//, '')}
                    </a>
                  )}
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
          <div className="p-6 pb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h3 className="text-2xl font-bold text-[#D4AF37]">Social Links</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
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
                        className="group relative overflow-hidden bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/60 hover:shadow-xl hover:shadow-[#D4AF37]/10 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4"
                        >
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className="relative flex-shrink-0">
                              {socialIcons[platform.toLowerCase()] ? (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center ring-2 ring-[#D4AF37]/30 group-hover:ring-[#D4AF37]/60 transition-all">
                                  <img
                                    src={socialIcons[platform.toLowerCase()]}
                                    alt={platform}
                                    className="w-6 h-6 object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center ring-2 ring-[#D4AF37]/30 group-hover:ring-[#D4AF37]/60 transition-all">
                                  <Globe className="w-6 h-6 text-[#D4AF37]" />
                                </div>
                              )}
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-foreground capitalize text-base leading-tight mb-1">
                                {platform}
                              </div>
                              <div className="text-sm text-[#D4AF37] truncate font-medium">
                                {extractHandle(platform, link)}
                              </div>
                            </div>

                            {/* Arrow Icon */}
                            <ExternalLink className="w-5 h-5 text-[#D4AF37] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>

                          {/* Hover Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/5 to-[#D4AF37]/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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

        {/* NFTs Section */}
        {activeSection === 'nfts' && (
          <div className="p-6 pb-6 max-h-[calc(100vh-200px)] overflow-y-auto">
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
                  {expandedCollection ? (
                    // Show NFTs from selected collection
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/40">
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
                            {groupedNfts[expandedCollection]?.length || 0} items
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                        {groupedNfts[expandedCollection]?.map((nft: any, index: number) => (
                          <div
                            key={`${nft.contract}-${nft.identifier}-${index}`}
                            className="group relative overflow-hidden rounded-xl cursor-pointer hover:scale-105 transition-transform duration-300"
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
                              
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="text-white text-sm font-semibold">View Details</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Show collection buttons
                    <div className="max-h-[calc(100vh-400px)] overflow-y-auto space-y-3 pr-2">
                      {Object.entries(groupedNfts).map(([collection, collectionNfts]) => (
                        <button
                          key={collection}
                          onClick={() => setExpandedCollection(collection)}
                          className="w-full p-4 bg-gradient-to-r from-card/60 to-card/40 hover:from-card/80 hover:to-card/60 border border-border/40 hover:border-[#D4AF37]/40 rounded-xl transition-all duration-300 hover:scale-[1.02] group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Collection Preview Images */}
                              <div className="flex -space-x-3">
                                {collectionNfts.slice(0, 3).map((nft: any, idx: number) => (
                                  <div 
                                    key={idx}
                                    className={`w-12 h-12 ${collection === 'POAPs' ? 'rounded-full' : 'rounded-lg'} overflow-hidden border-2 border-background bg-muted/20`}
                                  >
                                    {nft.image_url ? (
                                      <img 
                                        src={nft.image_url} 
                                        alt="" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xl">
                                        {collection === 'POAPs' ? '🏅' : '🖼️'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {collectionNfts.length > 3 && (
                                  <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/20 border-2 border-background flex items-center justify-center">
                                    <span className="text-xs font-bold text-[#D4AF37]">
                                      +{collectionNfts.length - 3}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Collection Info */}
                              <div className="text-left">
                                <h4 className="font-bold text-foreground text-base group-hover:text-[#D4AF37] transition-colors">
                                  {formatCollectionName(collection)}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {(() => {
                                    const uniqueCount = collectionNfts.length;
                                    const totalCount = collectionNfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);
                                    return totalCount > uniqueCount 
                                      ? `${uniqueCount} unique (${totalCount} total)`
                                      : `${uniqueCount} ${uniqueCount === 1 ? 'item' : 'items'}`;
                                  })()}
                                </p>
                              </div>
                            </div>
                            
                            {/* Floor Price & Arrow */}
                            <div className="flex items-center gap-4">
                              {collectionNfts[0]?.floor_price && (
                                <div className="text-right bg-[#D4AF37]/5 px-3 py-2 rounded-lg border border-[#D4AF37]/20">
                                  <p className="text-xs text-muted-foreground">Floor</p>
                                  <p className="text-sm font-bold text-[#D4AF37] flex items-center gap-1">
                                    💎 {collectionNfts[0].floor_price} ETH
                                  </p>
                                </div>
                              )}
                              <ChevronDown className="w-5 h-5 text-[#D4AF37] -rotate-90 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {web3BioProfile?.address && !expandedCollection && (
                    <div className="flex justify-center pt-4">
                      <Button
                        asChild
                        className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
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
                </>
              )}
            </div>
          </div>
        )}

        {/* Activity/Transactions Section */}
        {activeSection === 'activity' && (
          <div className="p-6 pb-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-[#D4AF37]">⚡ Wallet Activity</h3>
                {transactions && transactions.totalChains > 0 && (
                  <Badge variant="secondary" className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                    {transactions.totalChains} {transactions.totalChains === 1 ? 'Chain' : 'Chains'}
                  </Badge>
                )}
              </div>

              {transactionsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#D4AF37] border-r-transparent mb-4"></div>
                  <p className="text-muted-foreground">Loading multi-chain activity...</p>
                </div>
              ) : !transactions ? (
                <div className="text-center py-12 space-y-4">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                  <div>
                    <p className="text-lg font-medium mb-2">Load Your Multi-Chain Activity</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      View your transaction history across 20+ blockchain networks
                    </p>
                    <Button
                      onClick={() => {
                        // Trigger transactions load if available
                        if (!transactionsLoading) {
                          window.location.reload(); // Simple reload to trigger preload
                        }
                      }}
                      className="gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                    >
                      <Activity className="w-4 h-4" />
                      Load Wallet Activity
                    </Button>
                  </div>
                </div>
              ) : transactions.chains && transactions.chains.length > 0 ? (
                <div className="space-y-6">
                  <ActivityGraph 
                    chains={transactions.chains.map((c: any) => ({
                      chain: c.chain,
                      chainKey: c.chainKey,
                      totalTransactions: c.totalTransactions
                    }))}
                  />
                  
                  <div className="space-y-4">
                    {transactions.chains.map((chain: any) => (
                      <div key={chain.chainKey} className="border border-border/50 rounded-xl overflow-hidden bg-card/30">
                        <div className="bg-gradient-to-r from-[#D4AF37]/10 to-transparent p-4 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-foreground flex items-center gap-2">
                                <span className="text-[#D4AF37]">{chain.chain}</span>
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {chain.totalTransactions} {chain.totalTransactions === 1 ? 'transaction' : 'transactions'} found
                              </p>
                            </div>
                            <a
                              href={`https://${chain.chainKey === 'ethereum' ? '' : `${chain.chainKey}.`}etherscan.io/address/${web3BioProfile?.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
                            >
                              View on Explorer →
                            </a>
                          </div>
                        </div>
                        <div className="divide-y divide-border/30">
                          {chain.transactions.slice(0, 5).map((tx: any, idx: number) => (
                            <div key={tx.hash} className="p-4 hover:bg-muted/20 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${tx.isError ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                      {tx.isError ? '✗ Failed' : '✓ Success'}
                                    </span>
                                    {tx.methodId && tx.methodId !== '0x' && (
                                      <span className="text-xs px-2 py-1 rounded-full bg-muted/30 text-muted-foreground">
                                        {tx.methodId.slice(0, 10)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">From: </span>
                                      <span className="font-mono">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">To: </span>
                                      <span className="font-mono">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Value: </span>
                                      <span className="font-medium">{(parseInt(tx.value) / 1e18).toFixed(4)} ETH</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Time: </span>
                                      <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <a
                                  href={`https://${chain.chainKey === 'ethereum' ? '' : `${chain.chainKey}.`}etherscan.io/tx/${tx.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors"
                                  title="View transaction"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-lg font-medium text-foreground mb-2">No Transactions Found</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    This wallet doesn't have any recent transactions on the supported chains, or the transactions are still being indexed.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Farcaster Section */}
        {activeSection === 'farcaster' && (
          <div className="p-6 pb-6">
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">📰 Farcaster Feed</h3>
            <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
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
