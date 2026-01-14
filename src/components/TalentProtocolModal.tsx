import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Share2, Check, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import talentProtocolIcon from '@/assets/talent-protocol-icon.jpeg';

const SUPA_URL = "https://gdjjboorqviobvvygpca.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE";

interface TalentProtocolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: string;
  ens?: string;
  talentId?: string;
}

interface TalentSection {
  key: string;
  title: string;
  items: { key: string; label: string; value: string | number }[];
}

interface TalentData {
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    talentId: string | null;
    buildingUrl: string | null;
    openInTalentUrl: string;
    shareUrl: string;
  } | null;
  scores: {
    builder: { value: number | null; levelLabel: string | null } | null;
    creator: { value: number | null; levelLabel: string | null } | null;
  } | null;
  verification: {
    humanCheckmark: {
      isVerified: boolean;
      providers: string[];
    } | null;
  } | null;
  sections: TalentSection[];
}

export const TalentProtocolModal = ({
  open,
  onOpenChange,
  wallet,
  ens,
  talentId,
}: TalentProtocolModalProps) => {
  const [data, setData] = useState<TalentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!wallet && !ens && !talentId) return;

    setLoading(true);
    setError(null);

    console.log('[TalentModal] Fetching with:', { wallet, ens, talentId });

    try {
      const res = await fetch(`${SUPA_URL}/functions/v1/get-talent-protocol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPA_ANON}`,
        },
        body: JSON.stringify({
          wallet: wallet || undefined,
          ens: ens || undefined,
          talentId: talentId || undefined,
        }),
      });

      const result = await res.json();
      console.log('[TalentModal] Response:', result);

      if (result?.error) {
        setData(null);
        setError(result.error);
      } else if (result?.noData === true && !result?.profile && !result?.scores) {
        setData(null);
        setError('No Talent data found for this user');
      } else {
        setData(result as TalentData);
      }
    } catch (err) {
      console.error('[TalentModal] Error:', err);
      setData(null);
      setError('Talent data unavailable right now');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, wallet, ens, talentId]);

  const handleShare = async () => {
    if (data?.profile?.shareUrl) {
      try {
        await navigator.clipboard.writeText(data.profile.shareUrl);
        toast.success('Link copied to clipboard');
      } catch {
        toast.error('Failed to copy link');
      }
    }
  };

  const handleOpenInTalent = () => {
    if (data?.profile?.openInTalentUrl) {
      window.open(data.profile.openInTalentUrl, '_blank');
    }
  };

  // Get icon for section
  const getSectionIcon = (sectionKey: string): string => {
    const icons: Record<string, string> = {
      talent_protocol: 'ƚ',
      github: '',
      onchain: '◆',
      farcaster: '',
      lens: '🌿',
      twitter: '',
      achievements: '🏆',
      affiliations: '🤝',
      accounts: '👤',
    };
    return icons[sectionKey] || '📊';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-border/50 rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between sticky top-0 bg-background z-10 border-b border-border/30">
          <div className="flex items-center gap-3">
            <img 
              src={talentProtocolIcon} 
              alt="Talent Protocol" 
              className="w-8 h-8 rounded-lg"
            />
            <DialogTitle className="text-lg font-semibold text-foreground">Talent Protocol</DialogTitle>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-center gap-2">
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-muted-foreground text-center">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : data ? (
            <div className="space-y-4 py-4">
              {/* Profile Header */}
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-24 w-24 border-2 border-violet-200 dark:border-violet-800">
                  <AvatarImage src={data.profile?.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
                    {data.profile?.displayName?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <h3 className="text-xl font-semibold text-foreground">
                  {data.profile?.displayName || ens || 'Unknown'}
                </h3>
                
                {data.profile?.talentId && (
                  <p className="text-sm text-muted-foreground">
                    Talent ID #{data.profile.talentId}
                  </p>
                )}
                
                {data.profile?.buildingUrl && (
                  <p className="text-sm text-muted-foreground">
                    Building {data.profile.buildingUrl}
                  </p>
                )}
              </div>

              {/* Score Chips */}
              <div className="flex justify-center gap-2 flex-wrap">
                {data.scores?.builder && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border/50">
                    <span className="text-sm">🛠️</span>
                    <span className="text-sm font-medium text-foreground">
                      Builder Score {data.scores.builder.value}
                    </span>
                  </div>
                )}
                
                {data.scores?.creator && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border/50">
                    <span className="text-sm">🎨</span>
                    <span className="text-sm font-medium text-foreground">
                      Creator Score {data.scores.creator.value}
                    </span>
                  </div>
                )}
              </div>

              {/* Human Checkmark Section - Always show */}
              <div className="space-y-2">
                <div className="border-t border-border/30 pt-3">
                  <h4 className="text-center font-semibold text-foreground mb-2">
                    Human Checkmark
                  </h4>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {data.verification?.humanCheckmark?.isVerified ? (
                      data.verification.humanCheckmark.providers.length > 0 ? (
                        data.verification.humanCheckmark.providers.map((provider) => (
                          <Badge
                            key={provider}
                            variant="outline"
                            className="gap-1 px-2.5 py-1 bg-green-500/10 border-green-500/30"
                          >
                            <Check className="w-3 h-3 text-green-500" />
                            {provider}
                            <span className="text-green-600 dark:text-green-400 text-xs ml-1">Verified</span>
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="gap-1 px-2.5 py-1 bg-green-500/10 border-green-500/30">
                          <Check className="w-3 h-3 text-green-500" />
                          Verified Human
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="gap-1 px-2.5 py-1 text-muted-foreground">
                        <X className="w-3 h-3 text-muted-foreground" />
                        Not verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Credentials Sections */}
              {data.sections.length > 0 && (
                <div className="space-y-4">
                  <div className="border-t border-border/30 pt-3">
                    <h4 className="text-center font-semibold text-foreground mb-3">
                      Credentials
                    </h4>
                  </div>

                  {data.sections.map((section) => (
                    <div key={section.key} className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground text-center">
                        {section.title}
                      </h5>
                      <div className="flex flex-wrap justify-center gap-2">
                        {section.items.map((item) => (
                          <div
                            key={item.key}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border/50 text-sm"
                          >
                            <span className="opacity-60">{getSectionIcon(section.key)}</span>
                            <span className="font-medium text-foreground">{item.label}</span>
                            <span className="text-muted-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex gap-2 pt-4 border-t border-border/30">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleOpenInTalent}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Talent App
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};