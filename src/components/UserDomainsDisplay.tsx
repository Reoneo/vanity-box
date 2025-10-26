import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Pencil, Send, Trash2, ExternalLink } from 'lucide-react';
import { useTheme } from 'next-themes';
import ensLogoBlue from '@/assets/ens-logo-blue.png';
import ensLogoLink from '@/assets/ens-logo-link.png';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';
import { DomainEditPanel } from './DomainEditPanel';
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
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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
          .select('full_name, registration_years, expiry_date, registration_date')
          .eq('wallet_address', walletAddress.toLowerCase());

        if (mintedError) {
          console.error('Error fetching minted domains:', mintedError);
        }

        // Create a map for quick lookups
        const expiryMap = new Map<string, { expiry_date: string; registration_years: number; registration_date: string }>();
        if (mintedData) {
          mintedData.forEach(md => {
            expiryMap.set(md.full_name.toLowerCase(), {
              expiry_date: md.expiry_date,
              registration_years: md.registration_years,
              registration_date: md.registration_date
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
                    registration_years: mintedInfo?.registration_years,
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
              registration_years: mintedInfo?.registration_years,
              created_at: mintedInfo?.registration_date || d.created_at,
            };
          })
        );
        
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

  if (domains.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">No domains found</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Mint your first ID to get started!
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

  const handleBackClick = () => {
    window.dispatchEvent(new CustomEvent('show-search'));
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
        Back
      </button>
      <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-6">My ID's</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {domains.map((domain, index) => (
          <div 
            key={`${domain.name}-${index}`}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-[#D4AF37] overflow-hidden bg-black/30 backdrop-blur-sm">
                <img
                  src={smithCashAvatar}
                  alt={domain.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">
                  {domain.name}.{domain.domain}
                </h3>
                <p className="font-mono text-sm text-gray-300 break-all">
                  {domain.address}
                </p>
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
                Edit
              </Button>

              <Button
                variant="outline"
                className="w-full border-gray-500 text-gray-400 hover:bg-gray-800"
                disabled
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Set Primary Domain
              </Button>

              <Button
                variant="outline"
                className="w-full border-gray-500 text-gray-400 hover:bg-gray-800"
                disabled
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Transfer
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
