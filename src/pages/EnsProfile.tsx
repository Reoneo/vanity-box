/**
 * ENS Profile Page
 * Lightweight view for displaying ENS name details and records
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Copy, Check, Calendar, Globe, Twitter, Github, Mail } from "lucide-react";
import { format } from "date-fns";
import { callEdge } from "@/lib/supaInvoke";
import ensLogoBlue from "@/assets/ens-logo-blue.png";

interface EnsRecord {
  key: string;
  value: string;
}

interface EnsProfileData {
  name: string;
  address?: string;
  avatar?: string;
  description?: string;
  url?: string;
  twitter?: string;
  github?: string;
  email?: string;
  expiryDate?: string;
  records?: EnsRecord[];
}

const EnsProfile = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EnsProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (!name) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use existing edge function to resolve ENS profile
        const data = await callEdge<EnsProfileData>("resolve-ens-profile", { name });

        if (data) {
          setProfile(data);
        } else {
          setError("Profile not found");
        }
      } catch (e) {
        console.error("Failed to fetch ENS profile:", e);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [name]);

  const handleCopyAddress = async () => {
    if (!profile?.address) return;
    await navigator.clipboard.writeText(profile.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Avatar URL with fallback
  const avatarUrl = profile?.avatar || `https://metadata.ens.domains/mainnet/avatar/${name}`;

  return (
    <>
      <Helmet>
        <title>{name} | Vanity.box</title>
        <meta name="description" content={`View ${name} ENS profile on Vanity.box`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src={ensLogoBlue} alt="ENS" className="w-6 h-6" />
              <span className="font-semibold">ENS Profile</span>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          {loading ? (
            <div className="space-y-6">
              {/* Loading skeleton */}
              <div className="flex items-center gap-4">
                <Skeleton className="w-24 h-24 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <img src={ensLogoBlue} alt="ENS" className="w-10 h-10 opacity-50" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Go Home
              </Button>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-[#5298FF] to-[#3370CC] flex-shrink-0">
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.innerHTML =
                        '<span class="flex items-center justify-center w-full h-full text-white font-bold text-2xl">ENS</span>';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold truncate">{name}</h1>
                  {profile.address && (
                    <button
                      onClick={handleCopyAddress}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mt-1"
                    >
                      <span className="font-mono text-sm">{truncateAddress(profile.address)}</span>
                      {copiedAddress ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                  {profile.expiryDate && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                      <Calendar className="w-4 h-4" />
                      <span>Expires {format(new Date(profile.expiryDate), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {profile.description && (
                <Card className="p-4">
                  <p className="text-foreground">{profile.description}</p>
                </Card>
              )}

              {/* Social Links */}
              {(profile.url || profile.twitter || profile.github || profile.email) && (
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Links</h3>
                  <div className="space-y-2">
                    {profile.url && (
                      <a
                        href={profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <span className="flex-1 truncate">{profile.url}</span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                    {profile.twitter && (
                      <a
                        href={`https://twitter.com/${profile.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Twitter className="w-5 h-5 text-muted-foreground" />
                        <span className="flex-1">@{profile.twitter}</span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                    {profile.github && (
                      <a
                        href={`https://github.com/${profile.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Github className="w-5 h-5 text-muted-foreground" />
                        <span className="flex-1">{profile.github}</span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                    {profile.email && (
                      <a
                        href={`mailto:${profile.email}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <span className="flex-1">{profile.email}</span>
                      </a>
                    )}
                  </div>
                </Card>
              )}

              {/* Additional Records */}
              {profile.records && profile.records.length > 0 && (
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Records</h3>
                  <div className="space-y-2">
                    {profile.records.map((record) => (
                      <div key={record.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <span className="text-sm text-muted-foreground">{record.key}</span>
                        <span className="text-sm font-mono truncate max-w-[60%]">{record.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* External Links */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`https://app.ens.domains/${name}`, "_blank")}
                >
                  <img src={ensLogoBlue} alt="ENS" className="w-4 h-4 mr-2" />
                  Manage on ENS
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`https://etherscan.io/name-lookup-search?id=${name}`, "_blank")}
                >
                  Etherscan
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default EnsProfile;
