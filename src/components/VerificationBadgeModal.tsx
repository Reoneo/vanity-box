import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Check } from 'lucide-react';
import { callEdge } from '@/lib/supaInvoke';

interface VerificationBadgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: string;
  ens?: string;
}

interface VerificationProvider {
  name: string;
  icon: string;
  verified: boolean;
}

const PROVIDER_ICONS: Record<string, string> = {
  'binance': '⬡',
  'coinbase': '©',
  'passport': '🌐',
  'worldcoin': '🌍',
  'humanity': '🌐',
  'gitcoin': '🟢',
  'civic': '🔐',
  'holonym': '⧫',
  'polygon': '⬡',
};

const getProviderIcon = (provider: string): string => {
  const lowerProvider = provider.toLowerCase();
  for (const [key, icon] of Object.entries(PROVIDER_ICONS)) {
    if (lowerProvider.includes(key)) return icon;
  }
  return '✓';
};

export const VerificationBadgeModal = ({
  open,
  onOpenChange,
  wallet,
  ens,
}: VerificationBadgeModalProps) => {
  const [providers, setProviders] = useState<VerificationProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && (wallet || ens)) {
      fetchVerification();
    }
  }, [open, wallet, ens]);

  const fetchVerification = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await callEdge<any>('get-talent-protocol', { wallet, ens });

      if (result?.verification?.humanCheckmark?.isVerified) {
        const providerNames = result.verification.humanCheckmark.providers || [];
        if (providerNames.length > 0) {
          setProviders(providerNames.map((name: string) => ({
            name: `${name} Verified`,
            icon: getProviderIcon(name),
            verified: true,
          })));
        } else {
          setProviders([{
            name: 'Human Verified',
            icon: '✓',
            verified: true,
          }]);
        }
      } else {
        setProviders([]);
        setError('No verification data found');
      }
    } catch (err) {
      console.error('[VerificationModal] Error:', err);
      setError('Unable to load verification data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 bg-background border border-border/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-border/30">
          <DialogTitle className="text-base font-semibold text-foreground">Verified Identity</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-foreground" />
          </button>
        </DialogHeader>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
          ) : providers.length > 0 ? (
            <div className="space-y-2">
              {providers.map((provider, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30"
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-background text-lg">
                    {provider.icon}
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">
                    {provider.name}
                  </span>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No verifications found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
