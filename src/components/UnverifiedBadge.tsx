import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface UnverifiedBadgeProps {
  /** Optional address shown in the popover for context. */
  address?: string;
  /** Show only the icon (compact mode for tile overlays). */
  compact?: boolean;
  className?: string;
}

/**
 * Amber "Unverified" badge that opens a popover explaining
 * why this data is unverified (manually-entered wallet, no signature).
 */
export function UnverifiedBadge({ address, compact, className }: UnverifiedBadgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border transition-colors',
          'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
          'hover:bg-amber-500/20',
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
          className,
        )}
        aria-label="Unverified — click for details"
      >
        <AlertTriangle className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        {!compact && <span className="font-medium">Unverified</span>}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Unverified Wallet
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              This data was fetched from a wallet address that was added
              manually. We have <strong>not</strong> verified ownership of
              this address because it was never authenticated by connecting
              the wallet and signing a proof of ownership.
              <br />
              <br />
              Tokens, NFTs, activity, social links, and reputation linked to
              an unverified address may not actually belong to this profile
              owner.
              {address && (
                <span className="mt-3 block font-mono text-[11px] break-all text-muted-foreground">
                  {address}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
