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
  const [nftSearchQuery, setNftSearchQuery] = useState("");
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [groupByCollection, setGroupByCollection] = useState(true);
  const [nftSortBy, setNftSortBy] = useState<'rarity' | 'recent' | 'price' | 'name'>('rarity');

  // Disable body scrolling when profile card is displayed
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Get unique chains from NFTs
  const availableChains = useMemo(() => {
    const chains = new Set(nfts.map(nft => nft.chain).filter(Boolean));
    return Array.from(chains).sort();
  }, [nfts]);

  // Filter and search NFTs
  const filteredNfts = useMemo(() => {
    let filtered = [...nfts];

    // Filter by search query
    if (nftSearchQuery) {
      const query = nftSearchQuery.toLowerCase();
      filtered = filtered.filter(nft => 
        nft.name?.toLowerCase().includes(query) ||
        nft.collection?.toLowerCase().includes(query) ||
        nft.identifier?.includes(query)
      );
    }

    // Filter by selected chains
    if (selectedChains.length > 0) {
      filtered = filtered.filter(nft => 
        nft.chain && selectedChains.includes(nft.chain)
      );
    }

    return filtered;
  }, [nfts, nftSearchQuery, selectedChains]);

  // Sort NFTs
  const sortedNfts = useMemo(() => {
    const sorted = [...filteredNfts];
    
    switch (nftSortBy) {
      case 'rarity':
        return sorted.sort((a, b) => (b.rarity_score || 0) - (a.rarity_score || 0));
      case 'recent':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_date || 0).getTime();
          const dateB = new Date(b.created_date || 0).getTime();
          return dateB - dateA;
        });
      case 'price':
        return sorted.sort((a, b) => (b.floor_price || 0) - (a.floor_price || 0));
      case 'name':
        return sorted.sort((a, b) => {
          const nameA = (a.name || a.identifier || '').toLowerCase();
          const nameB = (b.name || b.identifier || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      default:
        return sorted;
    }
  }, [filteredNfts, nftSortBy]);

  // Group NFTs by collection
  const groupedNfts = useMemo(() => {
    if (!groupByCollection) {
      return { 'All NFTs': sortedNfts };
    }

    const groups: Record<string, any[]> = {};
    sortedNfts.forEach(nft => {
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
  }, [sortedNfts, groupByCollection]);

  const handleChainToggle = (chain: string) => {
    setSelectedChains(prev => 
      prev.includes(chain)
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    );
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
          <div className="space-y-4 max-h-[80vh] overflow-y-auto">
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
          <div className="p-6">
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
          <div className="p-6">
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
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-[#D4AF37]">🖼️ NFT Collection</h3>
                {nfts.length > 0 && !nftLoading && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredNfts.length} {filteredNfts.length === 1 ? 'item' : 'items'} • {availableChains.length} {availableChains.length === 1 ? 'chain' : 'chains'}
                  </p>
                )}
              </div>
              {nfts.length > 0 && !nftLoading && (
                <Badge variant="outline" className="text-[#D4AF37] border-[#D4AF37]/30 text-lg px-3 py-1">
                  {nfts.length}
                </Badge>
              )}
            </div>

            {/* OpenSea-style Search, Filter, and Sort Controls */}
            {nfts.length > 0 && (
              <div className="space-y-3 mb-6 bg-card/30 backdrop-blur-sm p-4 rounded-xl border border-border/50">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, collection, or token ID..."
                    value={nftSearchQuery}
                    onChange={(e) => setNftSearchQuery(e.target.value)}
                    className="pl-11 h-12 bg-background/50 border-border/30 focus:border-[#D4AF37]/50 text-base"
                  />
                </div>

                {/* Filters and Sorting Row */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Sort By Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="border-border/50 bg-background/50">
                        <Filter className="w-4 h-4 mr-2" />
                        Sort: {nftSortBy.charAt(0).toUpperCase() + nftSortBy.slice(1)}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem onClick={() => setNftSortBy('rarity')}>
                        ⭐ Rarity Score
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setNftSortBy('price')}>
                        💎 Floor Price
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setNftSortBy('recent')}>
                        🕒 Recently Acquired
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setNftSortBy('name')}>
                        🔤 Name (A-Z)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Chain Filter Dropdown */}
                  {availableChains.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="border-border/50 bg-background/50">
                          🔗 Chains {selectedChains.length > 0 && `(${selectedChains.length})`}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        {availableChains.map(chain => (
                          <DropdownMenuCheckboxItem
                            key={chain}
                            checked={selectedChains.includes(chain)}
                            onCheckedChange={() => handleChainToggle(chain)}
                            className="capitalize"
                          >
                            {chain}
                          </DropdownMenuCheckboxItem>
                        ))}
                        {selectedChains.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSelectedChains([])}>
                              Clear filters
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Group Toggle */}
                  <Button
                    variant="outline"
                    onClick={() => setGroupByCollection(!groupByCollection)}
                    className={`border-border/50 ${groupByCollection ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30' : 'bg-background/50'}`}
                  >
                    {groupByCollection ? '📚 Grouped' : '📋 List View'}
                  </Button>

                  {/* Active Filter Badges */}
                  {selectedChains.map(chain => (
                    <Badge
                      key={chain}
                      variant="secondary"
                      className="capitalize cursor-pointer bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                      onClick={() => handleChainToggle(chain)}
                    >
                      {chain} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {nftLoading && nfts.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading NFTs from multiple chains...</p>
                    <p className="text-xs text-muted-foreground mt-1">Ethereum • Polygon • Base • Arbitrum • and more</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
                    {[...Array(12)].map((_, i) => (
                      <Card key={i} className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
                        <Skeleton className="aspect-square rounded-lg mb-2 bg-[#D4AF37]/10" />
                        <Skeleton className="h-4 w-3/4 mb-1 bg-[#D4AF37]/10" />
                        <Skeleton className="h-3 w-1/2 bg-[#D4AF37]/10" />
                      </Card>
                    ))}
                  </div>
                </div>
              ) : nfts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50">🖼️</div>
                  <p className="text-muted-foreground mb-2">No NFTs found</p>
                  <p className="text-xs text-muted-foreground">This wallet doesn't have any NFTs yet</p>
                </div>
              ) : filteredNfts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50">🔍</div>
                  <p className="text-muted-foreground mb-2">No NFTs match your filters</p>
                  <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[60vh] overflow-y-auto space-y-8">
                    {Object.entries(groupedNfts).map(([collection, collectionNfts]) => (
                      <div key={collection}>
                        {groupByCollection && (
                          <div className="mb-4 pb-3 border-b border-border/30 flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-foreground text-base">{collection}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                            {collectionNfts[0]?.floor_price && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Floor Price</p>
                                <p className="text-sm font-semibold text-[#D4AF37]">
                                  {collectionNfts[0].floor_price} ETH
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {collectionNfts.map((nft: any, index: number) => {
                            const rarity = nft.rarity_score ? getRarityLabel(nft.rarity_score) : null;
                            
                            return (
                              <Card
                                key={`${nft.contract}-${nft.identifier}-${index}`}
                                className="group relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/50 hover:shadow-2xl hover:shadow-[#D4AF37]/10 transition-all duration-300 cursor-pointer"
                                onClick={() => setSelectedNft(nft)}
                              >
                                {/* Rarity Badge */}
                                {rarity && (
                                  <div className="absolute top-2 left-2 z-10">
                                    <Badge 
                                      variant="secondary" 
                                      className={`${rarity.color} bg-black/60 backdrop-blur-sm border-0 text-xs font-bold px-2 py-0.5`}
                                    >
                                      ⭐ {rarity.label}
                                    </Badge>
                                  </div>
                                )}

                                {/* Chain Badge */}
                                {nft.chain && (
                                  <div className="absolute top-2 right-2 z-10">
                                    <Badge 
                                      variant="outline" 
                                      className="bg-black/60 backdrop-blur-sm border-border/30 text-xs capitalize px-2 py-0.5"
                                    >
                                      {nft.chain}
                                    </Badge>
                                  </div>
                                )}

                                {/* NFT Image */}
                                <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-black/20 to-black/40">
                                  {nft.image_url ? (
                                    <img
                                      src={nft.image_url}
                                      alt={nft.name || 'NFT'}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                      <div className="text-center">
                                        <div className="text-4xl mb-2 opacity-50">🖼️</div>
                                        <p>No Preview</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Hover Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                    <Button 
                                      size="sm" 
                                      variant="secondary"
                                      className="w-full bg-[#D4AF37]/90 hover:bg-[#D4AF37] text-black font-semibold"
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
                                <div className="p-3 space-y-2">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {nft.name || `#${nft.identifier}`}
                                    </p>
                                    {!groupByCollection && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {nft.collection}
                                      </p>
                                    )}
                                  </div>

                                  {/* Price and Rarity Score */}
                                  <div className="flex items-center justify-between text-xs">
                                    {nft.floor_price ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Floor:</span>
                                        <span className="font-semibold text-[#D4AF37]">
                                          {nft.floor_price} ETH
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">#{nft.identifier}</span>
                                    )}
                                    
                                    {nft.rarity_score > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className={rarity?.color}>
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
          <div className="p-6">
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
