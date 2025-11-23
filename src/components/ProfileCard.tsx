import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, MessageCircle, Repeat2, Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { PoapDetailModal } from "./PoapDetailModal";
import { formatDistanceToNow } from "date-fns";
import type { FarcasterCast } from "@/types/farcaster";
import defaultHeader from '@/assets/default-header-pattern.png';

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
      <Card className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="space-y-4">
            <div className="w-full h-48 overflow-hidden">
              <img
                src={web3BioProfile?.header || defaultHeader}
                alt="Header"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 space-y-4">
              {web3BioProfile?.avatar && (
                <div className="flex justify-center -mt-32 mb-4">
                  <Avatar className="h-48 w-48 border-4 border-background">
                    <AvatarImage src={web3BioProfile.avatar} alt={web3BioProfile.displayName} />
                    <AvatarFallback className="text-6xl bg-[#D4AF37]/10 text-[#D4AF37]">
                      {web3BioProfile.displayName?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

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
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">🖼️ NFTs</h3>
            <div className="space-y-4">
              {nftLoading && nfts.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <Card key={i} className="p-3 bg-card/50">
                      <Skeleton className="aspect-square rounded-lg mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </Card>
                  ))}
                </div>
              ) : nfts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No NFTs found</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
                    {nfts.map((nft, index) => (
                      <Card
                        key={`${nft.contract}-${nft.identifier}-${index}`}
                        className="p-3 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-[#D4AF37]/20 mb-2 bg-black/20">
                          {nft.image_url ? (
                            <img
                              src={nft.image_url}
                              alt={nft.name || 'NFT'}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {nft.name || `#${nft.identifier}`}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {nft.collection}
                          </div>
                          {nft.opensea_url && (
                            <a
                              href={nft.opensea_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-[#D4AF37] hover:underline"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </Card>
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
    </>
  );
};
