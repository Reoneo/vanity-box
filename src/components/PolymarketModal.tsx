import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, RefreshCw, X, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { callEdge } from '@/lib/supaInvoke';
import polymarketIcon from '@/assets/polymarket-icon.png';

interface PolymarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: string;
}

interface PolymarketPosition {
  market: string;
  outcome: string;
  shares: number;
  value: number;
  avgPrice: number;
}

interface PolymarketData {
  totalValue: number;
  winRate: number | null;
  openPositions: PolymarketPosition[];
  closedPositions: number;
  totalTrades: number;
  profit: number;
}

export const PolymarketModal = ({
  open,
  onOpenChange,
  wallet,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-[#D4AF37]/30">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between sticky top-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-10 border-b border-[#D4AF37]/30">
          <div className="flex items-center gap-3">
            <img 
              src={polymarketIcon} 
              alt="Polymarket" 
              className="w-8 h-8 rounded-lg"
            />
            <DialogTitle className="text-lg font-semibold text-white">Polymarket</DialogTitle>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </DialogHeader>

        {/* Content */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20 rounded-xl bg-white/10" />
                <Skeleton className="h-20 rounded-xl bg-white/10" />
                <Skeleton className="h-20 rounded-xl bg-white/10" />
                <Skeleton className="h-20 rounded-xl bg-white/10" />
              </div>
              <Skeleton className="h-32 rounded-xl bg-white/10" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-white/70 text-center">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="gap-2 border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/20"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : data ? (
            <div className="space-y-4 py-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white/5 border border-[#D4AF37]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs text-white/60">Portfolio Value</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    ${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-[#D4AF37]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs text-white/60">Win Rate</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {data.winRate !== null ? `${data.winRate}%` : 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-[#D4AF37]/20">
                  <div className="flex items-center gap-2 mb-2">
                    {data.profit >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs text-white/60">P&L</span>
                  </div>
                  <p className={`text-xl font-bold ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.profit >= 0 ? '+' : ''}${data.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-[#D4AF37]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-white/60">Total Trades</span>
                  </div>
                  <p className="text-xl font-bold text-white">{data.totalTrades}</p>
                </div>
              </div>

              {/* Open Positions */}
              {data.openPositions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#D4AF37]">Open Positions</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.openPositions.slice(0, 5).map((position, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <p className="text-sm text-white font-medium line-clamp-1">{position.market}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-white/60">{position.outcome}</span>
                          <span className="text-xs text-[#D4AF37]">
                            ${position.value.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-4 border-t border-[#D4AF37]/20">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/20"
                  onClick={handleOpenInPolymarket}
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Polymarket
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
