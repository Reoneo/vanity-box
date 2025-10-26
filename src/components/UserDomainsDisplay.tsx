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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {domains.map((domain, index) => (
          <div 
            key={`${domain.name}-${index}`}
            className="relative w-full h-full min-h-[280px] overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_50px_rgba(212,175,55,0.3)] transition-all duration-500 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 p-6 flex flex-col h-full">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-[#D4AF37] overflow-hidden bg-black/30 backdrop-blur-sm">
                  <img
                    src={smithCashAvatar}
                    alt={domain.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-lg text-white truncate mb-2">
                    {domain.name}.{domain.domain}
                  </h4>
                  <p className="font-mono text-sm text-gray-300">
                    {domain.address.slice(0, 10)}...{domain.address.slice(-8)}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {domain.created_at && (
                  <div className="text-sm text-gray-400">
                    Registered: {new Date(domain.created_at).toLocaleDateString()}
                  </div>
                )}
                {domain.expiry_date && (
                  <div className="text-sm">
                    <span className="text-gray-400">Expires:</span>
                    <span className={`ml-1 ${new Date(domain.expiry_date) < new Date() ? 'text-red-400 font-semibold' : 'text-white'}`}>
                      {new Date(domain.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <Button
                  onClick={() => handleManageDomain(domain, 'edit')}
                  size="sm"
                  className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
