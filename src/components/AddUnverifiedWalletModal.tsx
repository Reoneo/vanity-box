import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setValue('');
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>Add {chainLabel} address</DialogTitle>
          <DialogDescription className="text-xs">
            Enter a wallet address to fetch its cross-chain data. The address
            will be marked <strong>Unverified</strong> because ownership has
            not been proven by signing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
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
      </DialogContent>
    </Dialog>
  );
}
