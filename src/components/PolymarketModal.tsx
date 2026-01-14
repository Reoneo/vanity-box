import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Share2, X, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { callEdge } from '@/lib/supaInvoke';
import polymarketLogo from '@/assets/polymarket-logo.png';

interface PolymarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: string;
  ens?: string;
}

interface PolymarketPosition {
  market: string;
  outcome: string;
  shares: number;
  value: number;
  avgPrice: number;
  icon?: string;
  status?: string;
  profit?: number;
  percentPnl?: number;
}

interface PolymarketData {
  totalValue: number;
  winRate: number | null;
  openPositions: PolymarketPosition[];
  closedPositions: number;
  totalTrades: number;
  profit: number;
  profile?: {
    avatar?: string;
    displayName?: string;
    joinedDate?: string;
  };
}

export const PolymarketModal = ({
  open,
  onOpenChange,
  wallet,
  ens,
}: PolymarketModalProps) => {
  const [data, setData] = useState<PolymarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!wallet) return;

    setLoading(true);
    setError(null);

    try {
      const result = await callEdge<PolymarketData & { error?: string | null; noData?: boolean }>(
        'get-polymarket-data',
        { wallet }
      );

      if ((result as any)?.error) {
        setData(null);
        setError((result as any).error);
      } else if ((result as any)?.noData) {
        setData(null);
        setError('No Polymarket data found for this wallet');
      } else {
        setData(result as PolymarketData);
      }
    } catch (err) {
      console.error('[PolymarketModal] Error:', err);
      setData(null);
      setError('Polymarket data unavailable right now');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, wallet]);

  const handleOpenInPolymarket = () => {
    if (wallet) {
      window.open(`https://polymarket.com/profile/${wallet}`, '_blank');
    }
  };

  const handleShare = async () => {
    const url = `https://polymarket.com/profile/${wallet}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const displayName = ens || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Unknown');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-border/50 rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between sticky top-0 bg-background z-10 border-b border-border/30">
          <div className="flex items-center gap-3">
            <img 
              src={polymarketLogo} 
              alt="Polymarket" 
              className="w-8 h-8 rounded-lg object-contain"
            />
            <DialogTitle className="text-lg font-semibold text-foreground">Polymarket</DialogTitle>
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
            <div className="space-y-6 py-6">
              {/* Profile skeleton */}
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              {/* Stats skeleton */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
              {/* Positions skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-muted-foreground text-center">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="gap-2"
              >
                <Loader2 className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : data ? (
            <div className="space-y-6 py-4">
              {/* Profile Header */}
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={data.profile?.avatar} />
                  <AvatarFallback className="text-2xl bg-muted text-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <h3 className="text-xl font-semibold text-foreground">
                  {data.profile?.displayName || displayName}
                </h3>
                
                {data.profile?.joinedDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {data.profile.joinedDate}</span>
                  </div>
                )}
              </div>

              {/* Stats Grid - 4 columns like reference */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Positions Value</p>
                  <p className="text-sm font-bold text-foreground">
                    ${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-sm font-bold text-foreground">
                    {data.winRate !== null ? `${data.winRate}%` : 'N/A'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Profit/Loss</p>
                  <p className={`text-sm font-bold ${data.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {data.profit >= 0 ? '+' : ''}${Math.abs(data.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Predictions</p>
                  <p className="text-sm font-bold text-foreground">{data.totalTrades}</p>
                </div>
              </div>

              {/* History Positions */}
              {data.openPositions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    History Positions
                    <span className="flex-1 h-px bg-border/50" />
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.openPositions.slice(0, 10).map((position, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
                      >
                        {position.icon && (
                          <img 
                            src={position.icon} 
                            alt="" 
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {position.market}
                            {position.status && (
                              <span className="ml-2 text-xs text-muted-foreground">{position.status}</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              Bought {position.shares.toFixed(2)} {position.outcome}
                            </span>
                            {position.profit !== undefined && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${position.profit >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {position.profit >= 0 ? '+' : ''}${position.profit.toFixed(3)}
                                {position.percentPnl !== undefined && ` (${position.percentPnl.toFixed(2)}%)`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {loading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex gap-2 pt-4 border-t border-border/30">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleOpenInPolymarket}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Polymarket
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