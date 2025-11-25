import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, MessageCircle, Repeat2, Heart, Loader2, Search, Filter, ChevronDown, Link2, Globe, Mail, Calendar, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { siBluesky, siReddit, siWhatsapp, siFacebook, siSnapchat, siGithub, siTelegram, siDiscord } from "simple-icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { PoapDetailModal } from "./PoapDetailModal";
import { NFTDetailModal } from "./NFTDetailModal";
import { ActivityGraph } from "./ActivityGraph";
import { formatDistanceToNow } from "date-fns";
import type { FarcasterCast } from "@/types/farcaster";
import defaultHeader from '@/assets/default-header-pattern.png';
import worldcoinAvatar from '@/assets/worldcoin-default-avatar.svg';
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
      <Card className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden relative" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 pb-24">
              {/* Header and Avatar - Always visible */}
              <div className="relative flex-shrink-0">
              <div className="w-full h-40 overflow-hidden">
                <img
                  src={web3BioProfile?.header || defaultHeader}
                  alt="Header"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex justify-center absolute -bottom-20 left-0 right-0">
                <Avatar className="h-40 w-40 border-4 border-background bg-black">
                  <AvatarImage 
                    src={web3BioProfile?.avatar || worldcoinAvatar} 
                    alt={web3BioProfile?.displayName || 'User'}
                    className={!web3BioProfile?.avatar ? "scale-[2]" : ""}
                  />
                  <AvatarFallback className="text-6xl bg-[#D4AF37]/10 text-[#D4AF37]">
                    {web3BioProfile?.displayName?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="p-6 pt-24 space-y-2 flex-shrink-0">

              <h2 className="text-3xl font-bold text-center text-foreground">
                {web3BioProfile?.displayName || (currentWalletAddress ? shortenAddress(currentWalletAddress) : 'Unknown')}
              </h2>

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
                <p className="text-center text-muted-foreground max-w-2xl mx-auto text-sm">
                  {web3BioProfile.description}
                </p>
              )}

              {/* Following/Followers - Always render with fixed height */}
              <div className="flex justify-center items-center gap-1.5 text-sm min-h-[24px]">
                {efpStats ? (
                  <>
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
                  </>
                ) : null}
              </div>

              {/* Email/Website - Always render with fixed height */}
              <div className="flex items-center justify-center gap-4 flex-wrap min-h-[24px]">
                {web3BioProfile && (
                  <>
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
                  </>
                )}
              </div>

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

                  // Get icon component based on platform
                  const getIcon = () => {
                    const iconClass = "w-5 h-5";
                    const platformLower = platform.toLowerCase();
                    
                    switch (platformLower) {
                      case 'twitter':
                      case 'x':
                        return <Twitter className={iconClass} />;
                      case 'instagram':
                        return <Instagram className={iconClass} />;
                      case 'linkedin':
                        return <Linkedin className={iconClass} />;
                      case 'youtube':
                        return <Youtube className={iconClass} />;
                      case 'bluesky':
                        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d={siBluesky.path} /></svg>;
                      case 'reddit':
                        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d={siReddit.path} /></svg>;
                      case 'whatsapp':
                        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d={siWhatsapp.path} /></svg>;
                      case 'facebook':
                        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d={siFacebook.path} /></svg>;
                      case 'snapchat':
                        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d={siSnapchat.path} /></svg>;
                      case 'github':
                        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d={siGithub.path} /></svg>;
                      case 'telegram':
                        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d={siTelegram.path} /></svg>;
                      case 'discord':
                        return <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d={siDiscord.path} /></svg>;
                      default:
                        return <Globe className={iconClass} />;
                    }
                  };
                  
                  return (
                    <button
                      key={platform}
                      onClick={() => window.open(url, '_blank')}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/30 hover:border-[#D4AF37]/50 bg-card/30 hover:bg-card/50 transition-colors active:opacity-90 group touch-action-manipulation flex-shrink-0"
                    >
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#D4AF37]/80 shadow-md">
                        <div className="text-black dark:text-white">
                          {getIcon()}
                        </div>
                      </div>
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
                            {groupedNfts[expandedCollection]?.length || 0} items
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {groupedNfts[expandedCollection]?.map((nft: any, index: number) => (
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
                    <div className="space-y-3">
                      {Object.entries(groupedNfts).map(([collection, collectionNfts]) => (
                        <button
                          key={collection}
                          onClick={() => setExpandedCollection(collection)}
                          className="w-full p-4 bg-gradient-to-r from-card/60 to-card/40 hover:from-card/80 hover:to-card/60 border border-border/40 hover:border-[#D4AF37]/40 rounded-xl transition-colors active:opacity-90 group touch-action-manipulation flex-shrink-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-bold text-foreground text-base group-hover:text-[#D4AF37] transition-colors truncate">
                                {formatCollectionName(collection)}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                            <ChevronDown className="w-5 h-5 text-[#D4AF37] -rotate-90 transition-transform flex-shrink-0" />
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
