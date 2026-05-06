import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TalentProtocolModal } from './TalentProtocolModal';
import { callEdge } from '@/lib/supaInvoke';

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

  console.log('[TalentCard] Render with props:', { wallet, ens, talentId });

  useEffect(() => {
    const fetchScores = async () => {
      console.log('[TalentCard] fetchScores called, identifiers:', { wallet, ens, talentId });
      
      if (!wallet && !ens && !talentId) {
        console.log('[TalentCard] No identifiers provided, skipping fetch');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('[TalentCard] Fetching Talent Protocol data...');
        const data = await callEdge<any>('get-talent-protocol', { wallet, ens, talentId });
        console.log('[TalentCard] Response received:', data);

        if (data?.noData || data?.error) {
          console.log('[TalentCard] No data or error:', data?.error || 'noData flag set');
          setScores(null);
          setHasData(false);
        } else if (data?.scores) {
          console.log('[TalentCard] Scores found:', data.scores);
          setScores(data.scores);
          const builderVal = data.scores.builder?.value;
          const creatorVal = data.scores.creator?.value;
          // Hide if both scores are 0 or null
          setHasData(
            (builderVal !== null && builderVal !== 0) ||
            (creatorVal !== null && creatorVal !== 0)
          );
        } else {
          console.log('[TalentCard] No scores in response');
          setScores(null);
          setHasData(false);
        }
      } catch (err) {
        console.error('[TalentCard] Error fetching scores:', err);
        setScores(null);
        setError('Unable to load Talent data');
        setHasData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [wallet, ens, talentId]);

  // Don't render if no identifiers provided at all
  if (!wallet && !ens && !talentId) {
    console.log('[TalentCard] No identifiers, not rendering');
    return null;
  }

  // Don't render if finished loading and no data found
  if (!loading && !hasData) {
    console.log('[TalentCard] No data found, not rendering');
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
