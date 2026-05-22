import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { format, formatDistanceToNow, isPast, addDays } from 'date-fns';

interface ENSDomainDetailProps {
  domain: {
    name: string;
    type?: string;
    expiryDate?: string | number;
    createdAt?: string | number;
    image_url?: string;
    owner?: string;
    manager?: string;
    registrant?: string;
    resolvedAddress?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortAddr = (a?: string) => (a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '');

const toDateMs = (value?: string | number | null) => {
  if (!value) return null;
  const numeric = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric > 10_000_000_000 ? numeric : numeric * 1000;
};

export const ENSDomainDetailModal = ({ domain, open, onOpenChange }: ENSDomainDetailProps) => {
  const [copied, setCopied] = useState(false);

  if (!domain) return null;

  const expiryTimestamp = toDateMs(domain.expiryDate);
  const createdTimestamp = toDateMs(domain.createdAt);

  const expiryDate = expiryTimestamp ? new Date(expiryTimestamp) : null;
  const createdDate = createdTimestamp ? new Date(createdTimestamp) : null;
  const graceEndDate = expiryDate ? addDays(expiryDate, 90) : null;

  const isExpired = expiryDate ? isPast(expiryDate) : false;
  const isGraceEnded = graceEndDate ? isPast(graceEndDate) : false;
  const isExpiringSoon = expiryDate && !isExpired ? isPast(addDays(new Date(), -90)) && expiryDate < addDays(new Date(), 90) : false;

  const roles: { label: string; address?: string }[] = [
    { label: 'Owner', address: domain.owner },
    { label: 'Manager', address: domain.manager },
    { label: 'Registrant', address: domain.registrant },
    { label: 'ETH record', address: domain.resolvedAddress },
  ].filter((r) => !!r.address);


  const handleCopy = async () => {
    await navigator.clipboard.writeText(domain.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fallback avatar using ENS metadata service
  const avatarUrl = domain.image_url || `https://metadata.ens.domains/mainnet/avatar/${domain.name}`;
  const fallbackAvatar = `https://ens.xyz/name/${domain.name}/avatar`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border">
        {/* Header with avatar background */}
        <div className="relative h-32 bg-gradient-to-br from-[#5298FF]/20 to-[#3370CC]/20">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Avatar */}
        <div className="relative -mt-16 px-6">
          <div className="w-24 h-24 rounded-2xl border-4 border-background overflow-hidden bg-gradient-to-br from-[#5298FF] to-[#3370CC] shadow-lg">
            <img
              src={avatarUrl}
              alt={domain.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Try fallback, then show ENS text
                const img = e.currentTarget;
                if (img.src !== fallbackAvatar) {
                  img.src = fallbackAvatar;
                } else {
                  img.style.display = 'none';
                  img.parentElement!.innerHTML = '<span class="flex items-center justify-center w-full h-full text-white font-bold text-2xl">ENS</span>';
                }
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4 space-y-4">
          {/* Name */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{domain.name}</h2>
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Copy name"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="secondary" 
                className="capitalize bg-[#5298FF]/20 text-[#5298FF] border-[#5298FF]/30"
              >
                {domain.type || 'owned'}
              </Badge>
              {isExpired && (
                <Badge variant="destructive">Expired</Badge>
              )}
              {isExpiringSoon && !isExpired && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                  Expiring Soon
                </Badge>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3 bg-muted/30 rounded-xl p-4">
            {createdDate && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Created</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {format(createdDate, 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {expiryDate && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Expires</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-foreground'}`}>
                    {format(expiryDate, 'MMM d, yyyy')}
                  </span>
                  <p className={`text-xs ${isExpired ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {isExpired 
                      ? `Expired ${formatDistanceToNow(expiryDate)} ago`
                      : `in ${formatDistanceToNow(expiryDate)}`}
                  </p>
                </div>
              </div>
            )}
            {graceEndDate && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Grace period ends</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isGraceEnded ? 'text-emerald-500' : isExpired ? 'text-amber-500' : 'text-foreground'}`}>
                    {format(graceEndDate, 'MMM d, yyyy')}
                  </span>
                  <p className={`text-xs ${isGraceEnded ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {isGraceEnded
                      ? `Ended ${formatDistanceToNow(graceEndDate)} ago`
                      : `in ${formatDistanceToNow(graceEndDate)}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Roles */}
          {roles.length > 0 && (
            <div className="space-y-2 bg-muted/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Roles</h3>
              {roles.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <button
                    type="button"
                    onClick={() => window.open(`https://etherscan.io/address/${r.address}`, '_blank')}
                    className="text-sm font-mono text-foreground hover:text-[#5298FF] transition-colors"
                    title={r.address}
                  >
                    {shortAddr(r.address)}
                  </button>
                </div>
              ))}
            </div>
          )}


          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1 bg-gradient-to-r from-[#5298FF] to-[#3370CC] text-white hover:from-[#4288EF] hover:to-[#2260BC]"
              onClick={() => window.open(`https://app.ens.domains/${domain.name}`, '_blank')}
            >
              View on ENS
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`https://etherscan.io/name-lookup-search?id=${domain.name}`, '_blank')}
            >
              Etherscan
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
