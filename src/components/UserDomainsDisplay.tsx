import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Gift } from 'lucide-react';
import { useTheme } from 'next-themes';
import ensLogoBlue from '@/assets/ens-logo-blue.png';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';

interface Domain {
  name: string;
  domain: string;
  address: string;
  created_at?: string;
  updated_at?: string;
  isWrapped?: boolean;
}

interface UserDomainsDisplayProps {
  walletAddress?: string;
}

export const UserDomainsDisplay: React.FC<UserDomainsDisplayProps> = ({ walletAddress }) => {
  const { theme } = useTheme();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setDomains(data.domains || []);
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

  // Listen for domain updates
  useEffect(() => {
    const handleDomainsUpdated = () => {
      fetchDomains();
    };

    window.addEventListener('domains-updated', handleDomainsUpdated);
    return () => window.removeEventListener('domains-updated', handleDomainsUpdated);
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
          Mint your first smith.cash domain to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        My Domains ({domains.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {domains.map((domain, index) => (
          <Card
            key={`${domain.name}-${index}`}
            className="p-4 hover:shadow-lg transition-shadow border-[#D4AF37]/20 hover:border-[#D4AF37]/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-[#D4AF37] overflow-hidden">
                <img
                  src={smithCashAvatar}
                  alt={domain.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {domain.name}.{domain.domain}
                  </h4>
                  {domain.isWrapped && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge 
                          variant="secondary" 
                          className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 flex items-center gap-1"
                        >
                          <Gift className="w-3 h-3" />
                          Wrapped
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">This domain has been wrapped as an ERC-1155 NFT with enhanced features</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {domain.address.slice(0, 6)}...{domain.address.slice(-4)}
                </p>
              </div>
            </div>
            {domain.created_at && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Registered: {new Date(domain.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
