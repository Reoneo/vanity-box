import React, { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Wallet, LogOut, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  walletAddress?: string;
  username?: string;
}

interface WalletConnectionProps {
  className?: string;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({ className }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if we're running in World App
    const isInWorldApp = MiniKit.isInstalled();
    
    if (isInWorldApp) {
      console.log('✅ Running in World App - MiniKit is available');
    } else {
      console.log('❌ Not running in World App - MiniKit is not available');
    }
  }, []);

  // Remove auto-connect - users must manually connect

  const handleConnect = async () => {
    if (!MiniKit.isInstalled()) {
      console.warn('MiniKit is not installed. This app should be opened in World App.');
      alert('This app requires World App. Please open it in World App to connect your wallet.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Initiating wallet authentication with World App native UI...');
      console.log('📱 Platform info:', { 
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isInstalled: MiniKit.isInstalled()
      });
      
      // Enhanced authentication with better iOS support
      const nonce = generateNonce();
      console.log('🎲 Generated nonce:', nonce);
      
      const authParams = {
        nonce,
        requestId: 'vanity-box-auth-' + Date.now(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        notBefore: new Date(Date.now() - 60 * 1000), // 1 minute ago
        statement: 'Sign in to Vanity.₿ox to access your World ID domains and personalized features.'
      };
      
      console.log('📝 Auth parameters:', authParams);
      
      // Use the official World App wallet auth that shows the native modal
      const result = await MiniKit.commandsAsync.walletAuth(authParams);
      const { commandPayload, finalPayload } = result;

      console.log('📦 Wallet auth response:', { commandPayload, finalPayload, fullResult: result });

      if (finalPayload?.status === 'success' && finalPayload.address) {
        console.log('✅ Authentication successful, fetching ENS...');
        const ensName = await getWorldChainENS(finalPayload.address);
        const userData = {
          walletAddress: finalPayload.address,
          username: ensName
        };
        setUser(userData);
        sessionStorage.removeItem('skipAutoAuth');
        
        // Dispatch event for Index component
        window.dispatchEvent(new CustomEvent('wallet-connected', { detail: userData }));
        
        console.log('✅ User authenticated successfully:', userData);
      } else {
        console.error('❌ Authentication failed:', { commandPayload, finalPayload });
        if (finalPayload?.status === 'error') {
          throw new Error(`Authentication failed: ${JSON.stringify(finalPayload)}`);
        } else {
          throw new Error('Authentication failed - no success status received');
        }
      }
    } catch (error) {
      console.error('❌ Error during wallet authentication:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to connect wallet: ${errorMessage}\n\nPlease ensure you're using the latest version of World App and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setUser(null);
    // Prevent immediate auto-reconnect after manual disconnect (this session only)
    sessionStorage.setItem('skipAutoAuth', '1');
    
    // Dispatch event for Index component
    window.dispatchEvent(new CustomEvent('wallet-disconnected'));
  };

  const generateNonce = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const getWorldChainENS = async (address: string): Promise<string | undefined> => {
    console.log('🔍 Fetching ENS for address:', address);
    
    // Check cache first
    const cacheKey = `worldid_domain_${address.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ Using cached domain:', cached);
      return cached;
    }
    
    const NAMESTONE_API_KEY = import.meta.env.VITE_NAMESTONE_API_KEY;
    
    const fetchNameStone = async (url: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (NAMESTONE_API_KEY) {
        headers['Authorization'] = `Bearer ${NAMESTONE_API_KEY}`;
      }
      
      return fetch(url, { headers });
    };
    
    try {
      // Primary: NameStone get-names endpoint
      console.log('📡 Trying NameStone get-names...');
      const getNamesResponse = await fetchNameStone(
        `https://namestone.com/api/public_v1/get-names?address=${address.toLowerCase()}`
      );
      
      if (getNamesResponse.ok) {
        const data = await getNamesResponse.json();
        console.log('📦 NameStone get-names response:', JSON.stringify(data, null, 2));
        
        const domain = extractDomainFromResponse(data);
        if (domain) {
          sessionStorage.setItem(cacheKey, domain);
          console.log('✅ Found domain from get-names:', domain);
          return domain;
        }
      }
      
      // Fallback 1: NameStone search-names endpoint (try both query variations)
      const searchEndpoints = [
        `https://namestone.com/api/public_v1/search-names?q=${address.toLowerCase()}`,
        `https://namestone.com/api/public_v1/search-names?query=${address.toLowerCase()}`
      ];
      
      for (const endpoint of searchEndpoints) {
        try {
          console.log('📡 Trying NameStone search:', endpoint);
          const response = await fetchNameStone(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📦 NameStone search response:', JSON.stringify(data, null, 2));
            
            const domain = extractDomainFromResponse(data);
            if (domain) {
              sessionStorage.setItem(cacheKey, domain);
              console.log('✅ Found domain from search:', domain);
              return domain;
            }
          }
        } catch (error) {
          console.error(`❌ Failed to search NameStone ${endpoint}:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to get ENS from NameStone:', error);
    }

    // Fallback 2: World Bridge username lookup
    try {
      console.log('🔄 Trying World Bridge username lookup...');
      const worldIdResp = await fetch(`https://bridge.worldcoin.org/v1/id/${address.toLowerCase()}`);
      if (worldIdResp.ok) {
        const worldIdData = await worldIdResp.json();
        console.log('📦 World Bridge data:', JSON.stringify(worldIdData, null, 2));
        if (worldIdData?.username) {
          const worldIdDomain = `${worldIdData.username}.world.id`;
          sessionStorage.setItem(cacheKey, worldIdDomain);
          console.log('✅ Found World Bridge domain:', worldIdDomain);
          return worldIdDomain;
        }
      }
    } catch (e) {
      console.error('❌ Failed World Bridge lookup:', e);
    }
    
    // Single retry after 1 second for slow indexers
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      console.log('🔄 Retrying NameStone get-names after delay...');
      const retryResponse = await fetchNameStone(
        `https://namestone.com/api/public_v1/get-names?address=${address.toLowerCase()}`
      );
      
      if (retryResponse.ok) {
        const data = await retryResponse.json();
        console.log('📦 NameStone retry response:', JSON.stringify(data, null, 2));
        
        const domain = extractDomainFromResponse(data);
        if (domain) {
          sessionStorage.setItem(cacheKey, domain);
          console.log('✅ Found domain from retry:', domain);
          return domain;
        }
      }
    } catch (error) {
      console.error('❌ Retry failed:', error);
    }
    
    console.log('❌ No World ID domain found for address:', address);
    return undefined;
  };

  // Helper method to extract domain from various response formats
  const extractDomainFromResponse = (data: any): string | undefined => {
    console.log('🔍 Extracting domain from response:', JSON.stringify(data, null, 2));
    
    // Helper function to construct domain from label + namespace
    const constructDomain = (nameObj: any): string | undefined => {
      if (nameObj?.label && nameObj?.namespace) {
        return `${nameObj.label}.${nameObj.namespace}.world.id`;
      }
      return nameObj?.name || nameObj?.domain || nameObj?.fqdn || nameObj;
    };
    
    // Helper function to prioritize .world.id domains
    const prioritizeDomains = (domains: string[]): string | undefined => {
      // Prefer domains with two labels before world.id (e.g., label.namespace.world.id)
      const twoLabelWorldId = domains.find(d => 
        d.endsWith('.world.id') && d.split('.').length === 4
      );
      if (twoLabelWorldId) return twoLabelWorldId;
      
      // Then any .world.id domain
      const worldIdDomain = domains.find(d => d.endsWith('.world.id'));
      if (worldIdDomain) return worldIdDomain;
      
      // Then .world domains
      const worldDomain = domains.find(d => d.endsWith('.world'));
      if (worldDomain) return worldDomain;
      
      // Finally, any domain
      return domains[0];
    };
    
    // Check multiple possible response formats
    const possibleArrays = [
      data?.names,
      data?.data?.names, 
      data?.results,
      data?.data?.results
    ].filter(arr => Array.isArray(arr) && arr.length > 0);
    
    for (const namesArray of possibleArrays) {
      console.log('✅ Found names array:', namesArray);
      
      const domains: string[] = [];
      
      for (const nameObj of namesArray) {
        const domain = constructDomain(nameObj);
        if (typeof domain === 'string' && domain.length > 0) {
          domains.push(domain);
        }
      }
      
      if (domains.length > 0) {
        const selectedDomain = prioritizeDomains(domains);
        if (selectedDomain) {
          console.log('✅ Selected domain:', selectedDomain);
          return selectedDomain;
        }
      }
    }
    
    // Handle single domain response (not in array)
    if (data && typeof data === 'object') {
      const singleDomain = constructDomain(data);
      if (typeof singleDomain === 'string' && singleDomain.length > 0) {
        console.log('📝 Found single domain:', singleDomain);
        return singleDomain;
      }
      
      // Check nested data object
      if (data.data) {
        const nestedDomain = constructDomain(data.data);
        if (typeof nestedDomain === 'string' && nestedDomain.length > 0) {
          console.log('📝 Found nested domain:', nestedDomain);
          return nestedDomain;
        }
      }
    }
    
    console.log('❌ No domain found in response');
    return undefined;
  };

  const formatAddress = (address: string): string => {
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  if (!user) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className={cn("h-10 bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800 transition-all duration-300 font-semibold", className)}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Connecting...
          </>
        ) : (
          'Connect'
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-10 px-4 bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800 transition-all duration-300 font-semibold", className)}
        >
          <span className="font-bold text-white truncate max-w-48">
            {user.username || formatAddress(user.walletAddress || '')}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
        <DropdownMenuItem 
          className="text-gray-700 hover:bg-gray-100 cursor-pointer"
          onClick={() => {
            // TODO: Implement My Domains functionality
            alert('My Domains feature coming soon!');
          }}
        >
          <User className="mr-2 h-4 w-4" />
          My Domains
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-red-600 hover:bg-red-50 cursor-pointer"
          onClick={handleDisconnect}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};