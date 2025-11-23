import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, MessageCircle, Repeat2, Heart, Loader2, Search, Filter, ChevronDown, Link2, Globe } from "lucide-react";
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
  activeNftSubSection?: 'opensea' | 'poaps';
  onNftSubSectionChange?: (section: 'opensea' | 'poaps') => void;
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
  activeNftSubSection = 'opensea',
  onNftSubSectionChange,
}: ProfileCardProps) => {
  const [copied, setCopied] = useState(false);
  const [selectedPoap, setSelectedPoap] = useState<any>(null);
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  useEffect(() => {
    if (activeSection) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [activeSection]);

  // Calculate available NFT collections
  const availableCollections = useMemo(() => {
    const collections = new Set<string>();
    nfts.forEach(nft => {
      if (nft.collection) {
        collections.add(nft.collection);
      }
    });
    return Array.from(collections).sort();
  }, [nfts]);

  // Filter NFTs based on selected collections
  const filteredNfts = useMemo(() => {
    if (selectedCollections.length === 0) return nfts;
    return nfts.filter(nft => 
      nft.collection && selectedCollections.includes(nft.collection)
    );
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
    return groups;
  }, [filteredNfts]);

  const handleCollectionToggle = (collection: string) => {
    setSelectedCollections(prev =>
      prev.includes(collection)
        ? prev.filter(c => c !== collection)
        : [...prev, collection]
    );
  };

  const formatCollectionName = (name: string) => {
    if (name.length > 25) {
      return name.substring(0, 25) + '...';
    }
    return name;
  };

  const getRarityLabel = (score: number) => {
    if (score >= 90) return { label: 'Legendary', color: 'text-purple-400' };
    if (score >= 70) return { label: 'Epic', color: 'text-pink-400' };
    if (score >= 50) return { label: 'Rare', color: 'text-blue-400' };
    if (score >= 30) return { label: 'Uncommon', color: 'text-green-400' };
    return { label: 'Common', color: 'text-gray-400' };
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCastText = (text: string) => {
    const urlRegex = /(https?:\/\/[\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
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

  const extractHandle = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/').filter(s => s);
      return segments[segments.length - 1] || url;
    } catch {
      return url;
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden bg-card/95 backdrop-blur-md border-border/50 shadow-2xl">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="relative">
            {/* Header Image with enhanced overlay */}
            <div 
              className="relative h-40 bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${web3BioProfile?.header || defaultHeader})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background"></div>
            </div>

            {/* Profile Content */}
            <div className="p-6 pt-0">
              {/* Avatar positioned to overlap header */}
              <div className="relative -mt-16 mb-4">
                <Avatar className="w-32 h-32 border-4 border-card shadow-xl ring-4 ring-[#D4AF37]/20">
                  <AvatarImage src={web3BioProfile?.avatar} alt={web3BioProfile?.displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 text-[#D4AF37] text-3xl font-bold">
                    {web3BioProfile?.displayName?.[0] || web3BioProfile?.identity?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Name and Address */}
              <div className="space-y-3 mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-2 break-words">
                    {web3BioProfile?.displayName || web3BioProfile?.identity}
                  </h2>
                  {currentWalletAddress && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg font-mono border border-border/30">
                        {shortenAddress(currentWalletAddress)}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyAddress(currentWalletAddress)}
                        className="h-8 w-8 p-0 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {copied && (
                        <span className="text-xs text-[#D4AF37] font-medium animate-fade-in">
                          Copied!
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                {web3BioProfile?.description && (
                  <p className="text-muted-foreground leading-relaxed text-base border-l-2 border-[#D4AF37]/30 pl-4">
                    {web3BioProfile.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-card to-muted/30 p-4 rounded-xl border border-border/40 hover:border-[#D4AF37]/40 transition-all">
                  <div className="text-2xl font-bold text-[#D4AF37]">
                    {efpStats?.followers_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div 
                  className="bg-gradient-to-br from-card to-muted/30 p-4 rounded-xl border border-border/40 hover:border-[#D4AF37]/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  onClick={onFollowingClick}
                >
                  <div className="text-2xl font-bold text-[#D4AF37]">
                    {efpStats?.following_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </div>
                <div className="bg-gradient-to-br from-card to-muted/30 p-4 rounded-xl border border-border/40 hover:border-[#D4AF37]/40 transition-all">
                  <div className="text-2xl font-bold text-[#D4AF37]">
                    {firstTransactionDate ? new Date(firstTransactionDate).getFullYear() : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Since</div>
                </div>
              </div>

              {/* Contact Information */}
              {web3BioProfile?.email && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact</h3>
                  <div className="flex items-center gap-2 text-foreground bg-muted/30 px-4 py-3 rounded-lg border border-border/30 hover:border-[#D4AF37]/30 transition-all">
                    <Globe className="w-4 h-4 text-[#D4AF37]" />
                    <a href={`mailto:${web3BioProfile.email}`} className="text-sm hover:text-[#D4AF37] transition-colors">
                      {web3BioProfile.email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Socials Section */}
        {activeSection === 'socials' && (
          <div className="p-6">
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">🔗 Social Links</h3>
            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {web3BioProfile?.links && Object.entries(web3BioProfile.links).map(([platform, url]: [string, any]) => {
                const handle = extractHandle(url);
                const icon = socialIcons[platform.toLowerCase()] || socialIcons.default;
                
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-card/50 hover:bg-card border border-border/50 hover:border-[#D4AF37]/50 rounded-xl transition-all hover:scale-105 group"
                  >
                    {icon && (
                      <img 
                        src={icon} 
                        alt={platform} 
                        className="w-8 h-8 rounded-lg group-hover:scale-110 transition-transform" 
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground capitalize">{platform}</div>
                      <div className="text-sm font-semibold text-foreground truncate group-hover:text-[#D4AF37] transition-colors">
                        {handle}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-[#D4AF37] transition-colors flex-shrink-0" />
                  </a>
                );
              })}
              {(!web3BioProfile?.links || Object.keys(web3BioProfile.links).length === 0) && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No social links found
                </div>
              )}
            </div>
          </div>
        )}

        {/* NFTs Section with Sub-Navigation */}
        {activeSection === 'nfts' && (
          <div className="p-6 pb-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Sub-Navigation Buttons */}
            <div className="flex gap-2 mb-6">
              <Button 
                onClick={() => onNftSubSectionChange?.('opensea')}
                variant={activeNftSubSection === 'opensea' ? 'default' : 'outline'}
                className={activeNftSubSection === 'opensea' ? 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold' : 'border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10'}
              >
                🎨 OpenSea NFTs
              </Button>
              <Button 
                onClick={() => onNftSubSectionChange?.('poaps')}
                variant={activeNftSubSection === 'poaps' ? 'default' : 'outline'}
                className={activeNftSubSection === 'poaps' ? 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold' : 'border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10'}
              >
                <span className="inline-block rotate-180">🏅</span> POAPs
              </Button>
            </div>

            {/* OpenSea NFTs Content */}
            {activeNftSubSection === 'opensea' && (
              <>
                <h3 className="text-2xl font-bold text-[#D4AF37] mb-4">
                  🎨 OpenSea NFTs
                </h3>

                {/* Collection Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="mb-4 w-full flex justify-between items-center border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10">
                      Filter by Collection
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {availableCollections.length > 0 ? (
                      availableCollections.map(collection => (
                        <DropdownMenuCheckboxItem
                          key={collection}
                          checked={selectedCollections.includes(collection)}
                          onCheckedChange={() => handleCollectionToggle(collection)}
                        >
                          {formatCollectionName(collection)}
                        </DropdownMenuCheckboxItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No collections found</DropdownMenuItem>
                    )}
                    {availableCollections.length > 0 && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem onClick={() => setSelectedCollections([])}>
                      Clear Filters
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {nftLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="w-32 h-32 rounded-full" />
                        <Skeleton className="w-24 h-4" />
                        <Skeleton className="w-16 h-4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {Object.keys(groupedNfts).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No NFTs found in selected collections
                      </div>
                    ) : (
                      Object.entries(groupedNfts).map(([collection, nfts]) => (
                        <div key={collection} className="mb-8">
                          <h4 className="text-xl font-semibold text-foreground mb-4">{collection}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {nfts.map((nft: any) => (
                              <div
                                key={nft.tokenId}
                                className="flex flex-col items-center gap-2 cursor-pointer group"
                                onClick={() => setSelectedNft(nft)}
                              >
                                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-[#D4AF37]/30 group-hover:border-[#D4AF37] transition-all duration-300 group-hover:scale-105">
                                  <img
                                    src={nft.image}
                                    alt={nft.name}
                                    className="w-full h-full object-cover"
                                  />
                                  {nft.rarity && nft.rarity.rank && (
                                    <Badge className="absolute top-2 right-2 rounded-full px-2 py-1 text-xs font-bold uppercase z-10" variant="secondary">
                                      #{nft.rarity.rank}
                                    </Badge>
                                  )}
                                  {nft.rarity && nft.rarity.score && (
                                    <div className="absolute bottom-0 left-0 w-full bg-black/50 text-white text-xs p-1 text-center z-10">
                                      <span className={getRarityLabel(nft.rarity.score).color}>
                                        {getRarityLabel(nft.rarity.score).label}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-foreground text-center truncate max-w-[140px]">
                                  {nft.name}
                                </div>
                                <div className="text-xs text-muted-foreground text-center">
                                  {nft.collection}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                    {nftNextCursor && (
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10"
                        onClick={onLoadMoreNfts}
                      >
                        {nftLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading more NFTs...
                          </>
                        ) : (
                          "Load More NFTs"
                        )}
                      </Button>
                    )}
                  </>
                )}
              </>
            )}

            {/* POAPs Content */}
            {activeNftSubSection === 'poaps' && (
              <div>
                <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">
                  <span className="inline-block rotate-180">🏅</span> POAPs
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
                  {poaps.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No POAPs found
                    </div>
                  ) : (
                    poaps.map((poap) => (
                      <div
                        key={poap.tokenId}
                        className="flex flex-col items-center gap-2 cursor-pointer group"
                        onClick={() => setSelectedPoap(poap)}
                      >
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-[#D4AF37]/30 group-hover:border-[#D4AF37] transition-all duration-300 group-hover:scale-105">
                          <img
                            src={poap.eventImageUrl}
                            alt={poap.eventName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-xs font-semibold text-foreground text-center truncate max-w-[140px]">
                          {poap.eventName}
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          {poap.eventYear}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Farcaster Section */}
        {activeSection === 'farcaster' && (
          <div className="p-6">
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">
              💬 Latest Farcaster Cast
            </h3>
            {castLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" />
                Loading latest cast...
              </div>
            ) : latestCast ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={latestCast.author.pfp_url} alt={latestCast.author.username} />
                    <AvatarFallback className="bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 text-[#D4AF37] text-sm font-bold">
                      {latestCast.author.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-semibold text-foreground">
                    {latestCast.author.display_name}
                    <span className="text-muted-foreground ml-1">
                      @{latestCast.author.username}
                    </span>
                  </div>
                </div>
                <div className="text-base text-foreground leading-relaxed border-l-2 border-[#D4AF37]/30 pl-4">
                  {formatCastText(latestCast.text)}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {latestCast.likes}
                  </div>
                  <div className="flex items-center gap-1">
                    <Repeat2 className="w-4 h-4" />
                    {latestCast.recasts}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {latestCast.replies}
                  </div>
                  <div className="text-xs">
                    {formatDistanceToNow(new Date(latestCast.timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                  <a
                    href={`https://warpcast.com/${latestCast.author.username}/${latestCast.hash.substring(0, 10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors"
                  >
                    View on Warpcast
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No Farcaster casts found
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modals */}
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
