import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, Clock, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
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

// ENS NameWrapper contract — when this is reported as owner, the real holder is the registrant
const NAME_WRAPPER_ADDR = '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401';
const isWrapperAddr = (a?: string) => !!a && String(a).toLowerCase() === NAME_WRAPPER_ADDR;
const isWrapperName = (n?: string) => !!n && String(n).toLowerCase() === 'wrapper.ens.eth';

const toDateMs = (value?: string | number | null) => {
  if (!value) return null;
  const numeric = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric > 10_000_000_000 ? numeric : numeric * 1000;
};

export const ENSDomainDetailModal = ({ domain, open, onOpenChange }: ENSDomainDetailProps) => {
  const [copied, setCopied] = useState(false);
  const [reverseNames, setReverseNames] = useState<Record<string, string>>({});

  // If owner/manager is the ENS NameWrapper contract, fall back to the registrant (real holder)
  const effectiveOwner = isWrapperAddr(domain?.owner) ? (domain?.registrant || domain?.owner) : domain?.owner;
  const effectiveManager = isWrapperAddr(domain?.manager) ? (domain?.registrant || domain?.manager) : domain?.manager;

  const roles: { label: string; address?: string }[] = [
    { label: 'Owner', address: effectiveOwner },
    { label: 'Manager', address: effectiveManager },
    { label: 'Registrant', address: domain?.registrant },
    { label: 'ETH record', address: domain?.resolvedAddress },
  ].filter((r) => /^0x[a-fA-F0-9]{40}$/.test(String(r.address || '')) && !isWrapperAddr(r.address));

  useEffect(() => {
    if (!open || roles.length === 0) return;
    let cancelled = false;
    const SUPABASE_URL = 'https://gdjjboorqviobvvygpca.supabase.co';
    const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE';
    const addrs = Array.from(new Set(roles.map((r) => String(r.address).toLowerCase())));
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(addrs.map(async (addr) => {
        try {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/get-web3bio-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
            body: JSON.stringify({ handle: addr }),
          });
          const data = await r.json();
          const arr = Array.isArray(data) ? data : (data ? [data] : []);
          let pick = '';
          for (const p of arr) {
            const n = p?.identity || p?.displayName;
            if (n && typeof n === 'string' && !isWrapperName(n) && (n.endsWith('.eth') || n.endsWith('.box'))) { pick = n; break; }
          }
          if (pick) map[addr] = pick;
        } catch {}
      }));
      if (!cancelled) setReverseNames(map);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, domain?.owner, domain?.manager, domain?.registrant, domain?.resolvedAddress]);

  if (!domain) return null;

  const expiryTimestamp = toDateMs(domain.expiryDate);
  const createdTimestamp = toDateMs(domain.createdAt);

  const expiryDate = expiryTimestamp ? new Date(expiryTimestamp) : null;
  const createdDate = createdTimestamp ? new Date(createdTimestamp) : null;
  const graceEndDate = expiryDate ? addDays(expiryDate, 90) : null;

  const isExpired = expiryDate ? isPast(expiryDate) : false;
  const isGraceEnded = graceEndDate ? isPast(graceEndDate) : false;
  const isExpiringSoon = expiryDate && !isExpired ? isPast(addDays(new Date(), -90)) && expiryDate < addDays(new Date(), 90) : false;




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
              {roles.map((r) => {
                const addr = String(r.address || '').toLowerCase();
                const ensName = reverseNames[addr];
                const target = ensName || addr;
                const display = ensName || shortAddr(r.address);
                return (
                  <div key={r.label} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <button
                      type="button"
                      onClick={() => { onOpenChange(false); window.location.href = `/${target}`; }}
                      className="text-sm font-mono text-foreground hover:text-[#5298FF] transition-colors truncate max-w-[55%] text-right"
                      title={`Open ${target} on vanity.box`}
                    >
                      {display}
                    </button>
                  </div>
                );
              })}
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
