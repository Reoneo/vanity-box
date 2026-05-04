import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useWalletSign } from '@/hooks/useWalletSign';
import { Loader2, Pencil, Send, Trash2, ExternalLink, RefreshCw, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import ensLogoBlue from '@/assets/ens-logo-blue.png';
import ensLogoLink from '@/assets/ens-logo-link.png';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';
import { DomainEditPanel } from './DomainEditPanel';
import { useVanityVerification } from '@/hooks/useVanityVerification';
import { useAccount } from 'wagmi';



interface Domain {
  name: string;
  domain: string;
  address: string;
  created_at?: string;
  updated_at?: string;
  isWrapped?: boolean;
  txHash?: string;
  registration_years?: number; // Years registered for
  expiry_date?: string; // Calculated expiry date
}

interface UserDomainsDisplayProps {
  walletAddress?: string;
}

export const UserDomainsDisplay: React.FC<UserDomainsDisplayProps> = ({ walletAddress }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { signForOperation } = useWalletSign();
  const { address: evmAddress } = useAccount();
  const vanityVerification = useVanityVerification();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  const fetchDomains = async () => {
    if (!walletAddress) {
      setDomains([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase.functions.invoke('get-user-domains', {
        body: { walletAddress },
      });

      if (supabaseError) {
        throw supabaseError;
      }

      if (data?.success) {
        // Filter domains to only show those owned by the connected wallet
        const filteredDomains = (data.domains || []).filter((domain: Domain) => 
          domain.address.toLowerCase() === walletAddress.toLowerCase()
        );
        
        // Fetch expiry dates from minted_domains table
        const { data: mintedData, error: mintedError } = await supabase
          .from('minted_domains')
          .select('full_name, registration_months, expiry_date, registration_date, grace_period_end')
          .eq('wallet_address', walletAddress.toLowerCase());

        if (mintedError) {
          console.error('Error fetching minted domains:', mintedError);
        }

        // Create a map for quick lookups
        const expiryMap = new Map<string, { expiry_date: string; registration_months: number; registration_date: string; grace_period_end?: string }>();
        if (mintedData) {
          mintedData.forEach(md => {
            expiryMap.set(md.full_name.toLowerCase(), {
              expiry_date: md.expiry_date,
              registration_months: md.registration_months,
              registration_date: md.registration_date,
              grace_period_end: md.grace_period_end
            });
          });
        }
        
        // Fetch txHash from Namestone API for each domain and merge with expiry data
        const domainsWithTx = await Promise.all(
          filteredDomains.map(async (d: Domain) => {
            const fullName = `${d.name}.${d.domain}`.toLowerCase();
            const mintedInfo = expiryMap.get(fullName);
            
            try {
              const namestoneApiUrl = `https://api.namestone.xyz/txs?name=${d.name}.${d.domain}`;
              const response = await fetch(namestoneApiUrl);
              if (response.ok) {
                const data = await response.json();
                // Extract tx hash from the first transaction if available
                if (data && data.length > 0 && data[0].tx_hash) {
                  return {
                    ...d,
                    txHash: data[0].tx_hash,
                    expiry_date: mintedInfo?.expiry_date,
                    registration_months: mintedInfo?.registration_months,
                    grace_period_end: mintedInfo?.grace_period_end,
                    created_at: mintedInfo?.registration_date || d.created_at,
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching tx for ${d.name}.${d.domain}:`, error);
            }
            // Fallback to localStorage or existing txHash
            const txMap = JSON.parse(localStorage.getItem('txMap') || '{}');
            const key = `${d.name}.${d.domain}`.toLowerCase();
            return {
              ...d,
              txHash: txMap[key] || d.txHash,
              expiry_date: mintedInfo?.expiry_date,
              registration_months: mintedInfo?.registration_months,
              grace_period_end: mintedInfo?.grace_period_end,
              created_at: mintedInfo?.registration_date || d.created_at,
            };
          })
        );

        // REMOVED: No longer merging from minted_domains if not in Namestone
        // Only show domains that actually exist in Namestone API response
        setDomains(domainsWithTx);
      } else {
        throw new Error(data?.error || 'Failed to fetch domains');
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [walletAddress]);

  // Listen for domain updates and back button
  useEffect(() => {
    const handleDomainsUpdated = () => {
      fetchDomains();
    };
    
    const handleBackToDomains = () => {
      setIsEditMode(false);
      setSelectedDomain(null);
    };

    window.addEventListener('domains-updated', handleDomainsUpdated);
    window.addEventListener('back-to-domains', handleBackToDomains);
    
    return () => {
      window.removeEventListener('domains-updated', handleDomainsUpdated);
      window.removeEventListener('back-to-domains', handleBackToDomains);
    };
  }, [walletAddress]);

  if (!walletAddress) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const handleBackClick = () => {
    window.dispatchEvent(new CustomEvent('show-search'));
  };

  if (domains.length === 0) {
    return (
      <div className="px-4 py-8 space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-foreground">{t('no_domains_found')}</h2>
          <p className="text-sm text-muted-foreground">
            Get your .vanity domain or verify ownership to claim a free .vanity.iota subdomain
          </p>
        </div>

        {/* Action Buttons */}
        <div className="max-w-sm mx-auto space-y-3">
          {/* Register Button */}
          <Button
            className="w-full h-12 bg-[#D4AF37] hover:bg-[#F4E4BC] text-black font-bold rounded-xl"
            onClick={() => window.open('https://get.unstoppabledomains.com/vanity/', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Register a .vanity Domain
          </Button>

          {/* Verify Button */}
          {!evmAddress && vanityVerification.step === 'idle' && (
            <p className="text-xs text-center text-amber-500">Connect your Ethereum wallet above to verify .vanity ownership</p>
          )}

          {evmAddress && vanityVerification.step === 'idle' && (
            <Button
              variant="outline"
              className="w-full h-12 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold rounded-xl"
              onClick={() => vanityVerification.verifyOwnership(evmAddress)}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify .vanity Ownership
            </Button>
          )}

          {vanityVerification.step === 'verifying' && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
              <span className="text-sm text-muted-foreground">Checking .vanity domains on Polygon...</span>
            </div>
          )}

          {vanityVerification.step === 'verified' && vanityVerification.vanityDomains.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <XCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">No .vanity domains found for {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => vanityVerification.reset()}>
                Try Again
              </Button>
            </div>
          )}

          {vanityVerification.step === 'verified' && vanityVerification.vanityDomains.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Found {vanityVerification.vanityDomains.length} .vanity domain{vanityVerification.vanityDomains.length > 1 ? 's' : ''}
                </span>
              </div>
              {vanityVerification.vanityDomains.map((domain) => {
                const subname = domain.replace(/\.vanity$/i, '');
                const fullIotaName = `${subname}.vanity.iota`;
                return (
                  <Button
                    key={domain}
                    className="w-full h-11 bg-[#D4AF37] hover:bg-[#F4E4BC] text-black font-bold rounded-xl"
                    onClick={() => vanityVerification.mintSubdomain(domain, walletAddress || '', evmAddress || '')}
                  >
                    Claim {fullIotaName}
                  </Button>
                );
              })}
            </div>
          )}

          {vanityVerification.step === 'minting' && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
              <span className="text-sm text-muted-foreground">Claiming your .vanity.iota subdomain...</span>
            </div>
          )}

          {vanityVerification.step === 'minted' && vanityVerification.mintedDomain && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-foreground font-medium">
                  {vanityVerification.mintedDomain.fullName} claimed!
                </span>
              </div>
              {vanityVerification.mintedDomain.profileUrl && (
                <Button variant="outline" size="sm" className="w-full text-xs border-[#D4AF37]/30 text-[#D4AF37]" onClick={() => window.open(vanityVerification.mintedDomain!.profileUrl, '_blank')}>
                  <ExternalLink className="h-3 w-3 mr-1.5" />
                  View Profile
                </Button>
              )}
            </div>
          )}

          {vanityVerification.step === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">{vanityVerification.error}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => vanityVerification.reset()}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleManageDomain = (domain: Domain, action: 'edit' | 'transfer') => {
    setSelectedDomain(domain);
    setIsEditMode(true);
    // Dispatch event to tell DomainEditPanel which tab to show
    window.dispatchEvent(new CustomEvent('domain-action', { detail: { action } }));
  };

  // Show edit panel if in edit mode
  if (isEditMode && selectedDomain) {
    return <DomainEditPanel domain={selectedDomain} />;
  }

  const handleRepairRedirects = async () => {
    try {
      setIsRepairing(true);
      toast.info('Regenerating redirects with updated thumbnails...');
      
      const { data, error } = await supabase.functions.invoke('repair-domain-redirects');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Successfully regenerated ${data.successful} redirects!`);
      } else {
        toast.error(data?.error || 'Failed to repair redirects');
      }
    } catch (error: any) {
      console.error('Error repairing redirects:', error);
      toast.error(error.message || 'Failed to repair redirects');
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="space-y-6 px-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          My IDs
        </h1>
      </div>

      {/* Domain Cards Grid */}
      <div className="grid grid-cols-1 gap-6">
        {domains.map((domain, index) => (
          <div 
            key={`${domain.name}-${index}`}
            className="relative bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-sm border-2 border-border/50 rounded-3xl p-6 transition-all duration-300 hover:border-[#D4AF37]/50 hover:shadow-lg hover:shadow-[#D4AF37]/10"
          >
            {/* Transaction Badge - Top Right */}
            {domain.txHash && !domain.txHash.startsWith('free-mint-') && (
              <a
                href={`https://worldchain-mainnet.explorer.alchemy.com/tx/${domain.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/60 transition-all duration-200 group z-10"
                title="View transaction"
              >
                <ExternalLink className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
              </a>
            )}

            {/* Domain Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-1 min-w-0 pr-12">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 break-words leading-tight">
                  {domain.name}.{domain.domain}
                </h2>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">Registered:</span> {domain.created_at ? new Date(domain.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">Expires:</span> {domain.expiry_date ? new Date(domain.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {/* Primary Edit Button */}
              <Button
                onClick={() => handleManageDomain(domain, 'edit')}
                className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] hover:from-[#F4E4BC] hover:to-[#D4AF37] text-black font-bold text-sm rounded-xl shadow-md shadow-[#D4AF37]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#D4AF37]/30 hover:scale-[1.02]"
              >
                <Pencil className="w-4 h-4 mr-2" />
                {t('edit')}
              </Button>

              {/* Secondary Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="outline"
                  className="h-11 border-border/60 text-muted-foreground hover:border-[#D4AF37]/30 hover:bg-background/50 rounded-xl transition-all duration-200"
                  disabled
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs">{t('extend')}</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-11 border-border/60 text-muted-foreground hover:border-[#D4AF37]/30 hover:bg-background/50 rounded-xl transition-all duration-200"
                  disabled
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-xs">Primary</span>
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full h-11 border-border/60 text-muted-foreground hover:border-[#D4AF37]/30 hover:bg-background/50 rounded-xl transition-all duration-200"
                disabled
              >
                <Send className="w-4 h-4 mr-2" />
                <span className="text-sm">{t('transfer')}</span>
              </Button>

              {/* Delete Button */}
              <Button
                variant="outline"
                className="w-full h-11 border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/70 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deletingDomain === `${domain.name}.${domain.domain}`}
                onClick={() => {
                  setDomainToDelete(domain);
                  setDeleteDialogOpen(true);
                }}
              >
                {deletingDomain === `${domain.name}.${domain.domain}` ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="text-sm">{t('deleting')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span className="text-sm">{t('delete')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Vanity Verify Section */}
      <div className="max-w-sm mx-auto space-y-4 pt-2">
        <div className="text-center space-y-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
            Unstoppable .vanity Domain
          </h3>
          <p className="text-xs text-muted-foreground">
            Verify your .vanity domain on Polygon to claim a free .vanity.iota subdomain
          </p>
        </div>

        {!evmAddress && vanityVerification.step === 'idle' && (
          <div className="text-center">
            <p className="text-xs text-amber-500 mb-3">Connect your Ethereum wallet above to verify .vanity ownership</p>
          </div>
        )}

        {evmAddress && vanityVerification.step === 'idle' && (
          <Button
            className="w-full h-11 bg-[#D4AF37] hover:bg-[#F4E4BC] text-black font-bold rounded-xl"
            onClick={() => vanityVerification.verifyOwnership(evmAddress)}
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verify .vanity Ownership
          </Button>
        )}

        {vanityVerification.step === 'verifying' && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-muted/50">
            <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
            <span className="text-sm text-muted-foreground">Checking .vanity domains on Polygon...</span>
          </div>
        )}

        {vanityVerification.step === 'verified' && vanityVerification.vanityDomains.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <XCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">No .vanity domains found for {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => vanityVerification.reset()}>
                Try Again
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs border-[#D4AF37]/30 text-[#D4AF37]" onClick={() => window.open('https://unstoppabledomains.com/tlds/vanity', '_blank')}>
                Get a .vanity Domain
              </Button>
            </div>
          </div>
        )}

        {vanityVerification.step === 'verified' && vanityVerification.vanityDomains.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">
                Found {vanityVerification.vanityDomains.length} .vanity domain{vanityVerification.vanityDomains.length > 1 ? 's' : ''}
              </span>
            </div>
            {vanityVerification.vanityDomains.map((domain) => {
              const subname = domain.replace(/\.vanity$/i, '');
              const fullIotaName = `${subname}.vanity.iota`;
              return (
                <Button
                  key={domain}
                  className="w-full h-11 bg-[#D4AF37] hover:bg-[#F4E4BC] text-black font-bold rounded-xl"
                  onClick={() => vanityVerification.mintSubdomain(domain, walletAddress || '', evmAddress || '')}
                >
                  Claim {fullIotaName}
                </Button>
              );
            })}
          </div>
        )}

        {vanityVerification.step === 'minting' && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-muted/50">
            <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
            <span className="text-sm text-muted-foreground">Claiming your .vanity.iota subdomain...</span>
          </div>
        )}

        {vanityVerification.step === 'minted' && vanityVerification.mintedDomain && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-foreground font-medium">
                {vanityVerification.mintedDomain.fullName} claimed!
              </span>
            </div>
            {vanityVerification.mintedDomain.profileUrl && (
              <Button variant="outline" size="sm" className="w-full text-xs border-[#D4AF37]/30 text-[#D4AF37]" onClick={() => window.open(vanityVerification.mintedDomain!.profileUrl, '_blank')}>
                <ExternalLink className="h-3 w-3 mr-1.5" />
                View Profile
              </Button>
            )}
          </div>
        )}

        {vanityVerification.step === 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{vanityVerification.error}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => vanityVerification.reset()}>
              Try Again
            </Button>
          </div>
        )}
      </div>
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        domainName={domainToDelete ? `${domainToDelete.name}.${domainToDelete.domain}` : ''}
        onConfirm={async () => {
          if (!domainToDelete) return;

          const fullName = `${domainToDelete.name}.${domainToDelete.domain}`;
          setDeletingDomain(fullName);
          setDeleteDialogOpen(false);

          try {
            throw new Error('Domain deletion is no longer supported in this project.');
          } catch (error) {
            console.error('Delete error:', error);
            toast.error(error instanceof Error ? error.message : t('failed_to_delete'));
          } finally {
            setDeletingDomain(null);
            setDomainToDelete(null);
          }
        }}
      />
    </div>
  );
};
