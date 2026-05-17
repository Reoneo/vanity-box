import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import type { SupportedChain } from '@/hooks/useLinkedWallets';

interface Props {
  open: boolean;
  onClose: () => void;
  chain: SupportedChain;
  chainLabel: string;
  onSubmit: (address: string) => void;
}

function validate(chain: SupportedChain, address: string): string | null {
  const a = address.trim();
  if (!a) return 'Address is required';
  switch (chain) {
    case 'ethereum':
      if (!/^0x[a-fA-F0-9]{40}$/.test(a))
        return 'Enter a valid 0x… EVM address (42 chars).';
      return null;
    case 'sui':
    case 'aptos':
      if (!/^0x[a-fA-F0-9]{1,64}$/.test(a))
        return `Enter a valid 0x… ${chain.toUpperCase()} address.`;
      return null;
    case 'ton':
      if (a.length < 10) return 'Enter a valid TON address.';
      return null;
  }
}

export function AddUnverifiedWalletModal({
  open,
  onClose,
  chain,
  chainLabel,
  onSubmit,
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = () => {
    const err = validate(chain, value);
    if (err) {
      setError(err);
      return;
    }
    onSubmit(value.trim());
    toast.success(`${chainLabel} address added as unverified`);
    setValue('');
    setError(null);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-background border border-[#D4AF37]/40 rounded-lg shadow-2xl p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 opacity-70 hover:opacity-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-1 mb-3 pr-6">
          <h3 className="text-base font-semibold">Add {chainLabel} address</h3>
          <p className="text-xs text-muted-foreground">
            Enter a wallet address to fetch its cross-chain data. The address
            will be marked <strong>Unverified</strong> because ownership has
            not been proven by signing.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="addr" className="text-xs">
              {chainLabel} wallet address
            </Label>
            <Input
              id="addr"
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder={chain === 'ethereum' ? '0x…' : '0x… or address'}
              className="font-mono text-xs"
            />
            {error && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
              Data for this address will display with an Unverified badge.
              Connect the wallet to verify ownership.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Add address
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
