// Verified DID Badge Component for Profile View

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldX, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedDidBadgeProps {
  isVerified: boolean;
  verifiedName?: string;
  className?: string;
  showTooltip?: boolean;
}

export function VerifiedDidBadge({ 
  isVerified, 
  verifiedName,
  className,
  showTooltip = true 
}: VerifiedDidBadgeProps) {
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'transition-all',
        isVerified
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
          : 'bg-muted/20 text-muted-foreground border-muted/50',
        className
      )}
    >
      {isVerified ? (
        <>
          <ShieldCheck className="w-3 h-3 mr-1" />
          Verified DID
        </>
      ) : (
        <>
          <Fingerprint className="w-3 h-3 mr-1" />
          Not Verified
        </>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        {isVerified ? (
          <p>
            {verifiedName 
              ? `Identity verified for ${verifiedName}` 
              : 'Decentralized identity verified'}
          </p>
        ) : (
          <p>DID not verified. Complete the identity flow to verify.</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
