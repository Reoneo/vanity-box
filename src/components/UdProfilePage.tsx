/**
 * UdProfilePage – Apple/Amazon-style profile page for Unstoppable Domains .box domains
 */
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdProfile } from "@/hooks/useUdProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowLeft,
  Globe,
  MapPin,
  ExternalLink,
  Users,
  Image as ImageIcon,
} from "lucide-react";
import { FaTwitter, FaDiscord, FaTelegram, FaReddit, FaYoutube, FaGithub, FaLinkedin } from "react-icons/fa";

const socialIcons: Record<string, React.ElementType> = {
  twitter: FaTwitter,
  discord: FaDiscord,
  telegram: FaTelegram,
  reddit: FaReddit,
  youtube: FaYoutube,
  github: FaGithub,
  linkedin: FaLinkedin,
};

interface UdProfilePageProps {
  domain: string;
  onBack?: () => void;
}

export function UdProfilePage({ domain, onBack }: UdProfilePageProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile, socialAccounts, social, nfts, loading, error } = useUdProfile(domain);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate("/");
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="flex flex-col md:flex-row gap-6">
          <Skeleton className="w-32 h-32 rounded-full mx-auto md:mx-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 text-center">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const avatarUrl = profile?.imagePath || "/placeholder.svg";
  const displayName = profile?.displayName || domain;
  const description = profile?.description;
  const location = profile?.location;
  const website = profile?.web2Url;

  // Collect active social links
  const activeSocials = socialAccounts
    ? Object.entries(socialAccounts).filter(
        ([, val]) => val && typeof val === "object" && val.location,
      )
    : [];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-10">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      {/* Header */}
      <Card className="p-6 md:p-8 rounded-2xl border border-border/50 shadow-lg bg-card mb-6">
        <div className={`flex ${isMobile ? "flex-col items-center text-center" : "flex-row items-start"} gap-6`}>
          {/* Avatar */}
          <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-[hsl(var(--primary))]/30 shadow-xl flex-shrink-0">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Name & meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground mb-3 font-mono">{domain}</p>

            {/* Stats row */}
            {social && (
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                {social.followerCount != null && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <strong className="text-foreground">{social.followerCount}</strong> followers
                  </span>
                )}
                {social.followingCount != null && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <strong className="text-foreground">{social.followingCount}</strong> following
                  </span>
                )}
              </div>
            )}

            {/* Location & website */}
            <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {location}
                </span>
              )}
              {website && (
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[hsl(var(--primary))] hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" /> {website}
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* About */}
      {description && (
        <Card className="p-5 md:p-6 rounded-2xl border border-border/50 shadow-sm bg-card mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </Card>
      )}

      {/* Social Links */}
      {activeSocials.length > 0 && (
        <Card className="p-5 md:p-6 rounded-2xl border border-border/50 shadow-sm bg-card mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Social Links</h2>
          <div className="flex flex-wrap gap-3">
            {activeSocials.map(([platform, data]) => {
              const Icon = socialIcons[platform];
              const url = (data as { location: string }).location;
              return (
                <a
                  key={platform}
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-sm text-foreground"
                >
                  {Icon ? <Icon className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                  <span className="capitalize">{platform}</span>
                </a>
              );
            })}
          </div>
        </Card>
      )}

      {/* NFT Gallery */}
      <Card className="p-5 md:p-6 rounded-2xl border border-border/50 shadow-sm bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-5 h-5" /> NFT Gallery
          </h2>
          {nfts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {nfts.length} items
            </Badge>
          )}
        </div>

        {nfts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No NFTs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {nfts.slice(0, 20).map((nft, idx) => (
              <a
                key={idx}
                href={nft.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl overflow-hidden border border-border/30 bg-muted/30 hover:border-[hsl(var(--primary))]/40 transition-all"
              >
                <div className="aspect-square overflow-hidden">
                  {nft.image_url ? (
                    <img
                      src={nft.image_url}
                      alt={nft.name || "NFT"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                {nft.name && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-foreground truncate">
                      {nft.name}
                    </p>
                    {nft.collection && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {nft.collection}
                      </p>
                    )}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default UdProfilePage;
