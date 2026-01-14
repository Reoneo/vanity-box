import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Share2, X, Calendar, Loader2, Settings, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePolymarketStats, PolymarketData } from '@/hooks/usePolymarketStats';
import polymarketIcon from '@/assets/polymarket-icon-blue.png';

interface PolymarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: string;
  ens?: string;
}

export const PolymarketModal = ({
  open,
  onOpenChange,
  wallet,
  ens,
}: PolymarketModalProps) => {
  const { data, loading, error, isEmpty, overrideAddress, refetch, setOverrideAddress, clearOverrideAddress } = usePolymarketStats(wallet);
  const [showSettings, setShowSettings] = useState(false);
  const [overrideInput, setOverrideInput] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  useEffect(() => {
    if (open && wallet) {
      refetch();
    }
  }, [open, wallet]);

  useEffect(() => {
    if (overrideAddress) {
      setOverrideInput(overrideAddress);
    } else {
      setOverrideInput('');
    }
  }, [overrideAddress]);

  const handleOpenInPolymarket = () => {
    const address = data?.effectiveAddress || wallet;
    if (address) {
      window.open(`https://polymarket.com/profile/${address}`, '_blank');
    }
  };

  const handleShare = async () => {
    const address = data?.effectiveAddress || wallet;
    const url = `https://polymarket.com/profile/${address}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSaveOverride = async () => {
    if (!overrideInput.trim()) {
      // Clear override
      setSavingOverride(true);
      const result = await clearOverrideAddress();
      setSavingOverride(false);
      
      if (result.success) {
        toast.success('Profile address cleared');
        setShowSettings(false);
      } else {
        toast.error(result.error || 'Failed to clear');
      }
      return;
    }

    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(overrideInput.trim())) {
      toast.error('Invalid Ethereum address format');
      return;
    }

    setSavingOverride(true);
    const result = await setOverrideAddress(overrideInput.trim());
    setSavingOverride(false);

    if (result.success) {
      toast.success('Profile address saved');
      setShowSettings(false);
    } else {
      toast.error(result.error || 'Failed to save');
    }
  };

  const displayName = ens || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Unknown');

  // Get stats from data
  const stats = data?.stats || {
    profitUsd: data?.profit || 0,
    winRate: data?.winRate ?? null,
    openPositionsCount: data?.positions?.length || data?.openPositions?.length || 0,
    closedPositionsCount: data?.closedPositions?.length || 0,
    totalTrades: data?.totalTrades || 0,
  };

  const totalValue = data?.totalValue || data?.positions?.reduce((sum, p) => sum + p.value, 0) || 0;
  const positions = data?.positions || data?.openPositions || [];
  const topPositions = data?.topPositions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-border/50 rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between sticky top-0 bg-background z-10 border-b border-border/30">
          <div className="flex items-center gap-3">
            <img 
              src={polymarketIcon} 
              alt="Polymarket" 
              className="w-8 h-8 rounded-lg object-contain"
            />
            <DialogTitle className="text-lg font-semibold text-foreground">Polymarket</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </DialogHeader>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-6 py-4 bg-muted/30 border-b border-border/30">
            <p className="text-sm font-medium text-foreground mb-2">Polymarket Profile Address</p>
            <p className="text-xs text-muted-foreground mb-3">
              If your Polymarket activity is linked to a different wallet (proxy wallet), enter it here.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="0x..."
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                className="flex-1 text-sm"
              />
              <Button
                size="sm"
                onClick={handleSaveOverride}
                disabled={savingOverride}
                className="gap-1"
              >
                {savingOverride ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </Button>
            </div>
            {data?.usedOverride && (
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Using override address: {data.effectiveAddress?.slice(0, 8)}...
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="space-y-6 py-6">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-foreground font-medium">No Polymarket activity found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This wallet doesn't have any Polymarket positions.
                </p>
              </div>
              
              {/* Inline override input for empty state */}
              <div className="w-full max-w-xs space-y-2 mt-4">
                <p className="text-xs text-muted-foreground text-center">
                  Have a different Polymarket profile address?
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="0x... (proxy wallet)"
                    value={overrideInput}
                    onChange={(e) => setOverrideInput(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveOverride}
                    disabled={savingOverride || !overrideInput.trim()}
                  >
                    {savingOverride ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set'}
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                className="gap-2 mt-2"
              >
                <Loader2 className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-muted-foreground text-center">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
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
                    {(data.profile?.displayName || displayName).charAt(0).toUpperCase()}
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

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Positions</p>
                  <p className="text-sm font-bold text-foreground">
                    ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-sm font-bold text-foreground">
                    {stats.winRate !== null ? `${stats.winRate}%` : '—'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Profit/Loss</p>
                  <p className={`text-sm font-bold ${stats.profitUsd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stats.profitUsd >= 0 ? '+' : ''}${Math.abs(stats.profitUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Trades</p>
                  <p className="text-sm font-bold text-foreground">{stats.totalTrades}</p>
                </div>
              </div>

              {/* Top Positions by PnL */}
              {topPositions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Top Positions
                    <span className="flex-1 h-px bg-border/50" />
                  </h4>
                  <div className="space-y-2">
                    {topPositions.map((position, index) => (
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
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {position.outcome}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${position.realizedPnl >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {position.realizedPnl >= 0 ? '+' : ''}${Math.abs(position.realizedPnl).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Positions */}
              {positions.filter(p => p.status === 'Open').length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Open Positions ({positions.filter(p => p.status === 'Open').length})
                    <span className="flex-1 h-px bg-border/50" />
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {positions.filter(p => p.status === 'Open').slice(0, 5).map((position, index) => (
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
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {position.shares.toFixed(2)} {position.outcome}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              ${position.value.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
