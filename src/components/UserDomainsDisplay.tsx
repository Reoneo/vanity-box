import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Pencil, Send, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import ensLogoBlue from '@/assets/ens-logo-blue.png';
import ensLogoLink from '@/assets/ens-logo-link.png';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';
import { DomainEditPanel } from './DomainEditPanel';
import { DomainAvatar } from './DomainAvatar';
import noResultsGif from '@/assets/no-results.gif';

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
      <div className="text-center py-8">
        <button 
          onClick={handleBackClick}
          className="flex items-center gap-2 text-foreground hover:text-primary mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('back')}
        </button>
        <p className="text-gray-600 dark:text-gray-400">{t('no_domains_found')}</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          {t('mint_first_id')}
        </p>
        {theme === 'light' && (
          <img 
            src={noResultsGif} 
            alt="No domains found" 
            className="w-48 h-48 mx-auto mt-4 object-contain"
          />
        )}
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
    <div className="space-y-4">
      <button 
        onClick={handleBackClick}
        className="flex items-center gap-2 text-foreground hover:text-primary mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('back')}
      </button>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t('my_ids')}</h2>
        <Button
          onClick={handleRepairRedirects}
          disabled={isRepairing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isRepairing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Fix Thumbnails
            </>
          )}
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {domains.map((domain, index) => (
          <div 
            key={`${domain.name}-${index}`}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl p-6 relative"
          >
            {/* Tx Icon Badge - Top Right */}
            {domain.txHash && !domain.txHash.startsWith('free-mint-') && (
              <a
                href={`https://worldchain-mainnet.explorer.alchemy.com/tx/${domain.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] hover:bg-[#D4AF37]/30 transition-all duration-200 group"
                title="View transaction receipt"
              >
                <ExternalLink className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
              </a>
            )}

            <div className="flex items-start gap-4 mb-6">
              <DomainAvatar domain={domain} walletAddress={walletAddress} />

              <div className="flex-1 min-w-0 pr-8">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">
                  {domain.name}.{domain.domain}
                </h3>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">
                    {t('registered')}: {domain.created_at ? new Date(domain.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('expires')}: {domain.expiry_date ? new Date(domain.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => handleManageDomain(domain, 'edit')}
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('edit')}
              </Button>

              <Button
                variant="outline"
                className="w-full border-gray-500 text-gray-400 hover:bg-gray-800"
                disabled
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t('extend')}
              </Button>

              <Button
                variant="outline"
                className="w-full border-gray-500 text-gray-400 hover:bg-gray-800"
                disabled
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t('set_primary_domain')}
              </Button>

              <Button
                variant="outline"
                className="w-full border-gray-500 text-gray-400 hover:bg-gray-800"
                disabled
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t('transfer')}
              </Button>

              <Button
                variant="destructive"
                className="w-full"
                disabled={deletingDomain === `${domain.name}.${domain.domain}`}
                onClick={() => {
                  setDomainToDelete(domain);
                  setDeleteDialogOpen(true);
                }}
              >
                {deletingDomain === `${domain.name}.${domain.domain}` ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('delete')}
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
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
            toast.info(t('deleting_domain'));

            const { data, error } = await supabase.functions.invoke('delete-namestone-name', {
              body: { 
                subdomain: fullName, 
                domain: domainToDelete.domain,
                walletAddress: walletAddress 
              },
            });

            if (error) {
              console.error('Supabase error:', error);
              throw error;
            }

            if (data?.success) {
              toast.success(t('domain_deleted'));
              await fetchDomains();
            } else {
              throw new Error(data?.error || t('failed_to_delete'));
            }
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
