import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench } from 'lucide-react';
import { TalentProtocolModal } from './TalentProtocolModal';

interface TalentProtocolCardProps {
  wallet?: string;
  ens?: string;
  talentId?: string;
}

interface TalentScores {
  builder: { value: number | null; levelLabel: string | null } | null;
  creator: { value: number | null; levelLabel: string | null } | null;
}

export const TalentProtocolCard = ({ wallet, ens, talentId }: TalentProtocolCardProps) => {
  const [scores, setScores] = useState<TalentScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      if (!wallet && !ens && !talentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          'https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-talent-protocol',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
              'Cache-Control': 'no-store',
            },
            body: JSON.stringify({ wallet, ens, talentId }),
            cache: 'no-store',
          }
        );

        const data = await response.json();
        
        if (data.noData || data.error) {
          setHasData(false);
        } else if (data.scores) {
          setScores(data.scores);
          setHasData(data.scores.builder !== null || data.scores.creator !== null);
        }
      } catch (err) {
        console.error('[TalentCard] Error fetching scores:', err);
        setError('Unable to load Talent data');
        setHasData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [wallet, ens, talentId]);

  // Don't render if no data
  if (!loading && !hasData) {
    return null;
  }

  const handleCardClick = () => {
    if (hasData) {
      setModalOpen(true);
    }
  };

  return (
    <>
      <Card 
        onClick={handleCardClick}
        className="p-4 bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl shadow-sm cursor-pointer hover:shadow-md hover:border-[#D4AF37]/50 transition-all duration-200"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🛠️</span>
          <span className="font-semibold text-foreground">Talent Protocol</span>
        </div>

        {/* Scores */}
        {loading ? (
          <div className="flex gap-6">
            <div className="flex-1">
              <Skeleton className="h-10 w-16 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-10 w-16 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <div className="flex gap-6">
            {/* Builder Score */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {scores?.builder?.value ?? '—'}
                </span>
                {scores?.builder?.levelLabel && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                    {scores.builder.levelLabel}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Builder Score</p>
            </div>

            {/* Creator Score */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {scores?.creator?.value ?? '—'}
                </span>
                {scores?.creator?.levelLabel && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                    {scores.creator.levelLabel}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Creator Score</p>
            </div>
          </div>
        )}
      </Card>

      {/* Modal */}
      <TalentProtocolModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        wallet={wallet}
        ens={ens}
        talentId={talentId}
      />
    </>
  );
};
