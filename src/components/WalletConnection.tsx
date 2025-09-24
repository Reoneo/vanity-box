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
    
    try {
      // Enhanced NameStone API call with multiple endpoints
      const endpoints = [
        `https://namestone.com/api/public_v1/get-names?address=${address.toLowerCase()}`,
        `https://namestone.com/api/public_v1/get-domain?address=${address.toLowerCase()}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log('📡 Trying endpoint:', endpoint);
          const response = await fetch(endpoint);
          console.log('📡 NameStone API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📦 NameStone API response data:', JSON.stringify(data, null, 2));
        
            // Enhanced domain parsing logic
            const domainFromResponse = extractDomainFromResponse(data);
            if (domainFromResponse) {
              console.log('✅ Found domain from response:', domainFromResponse);
              return domainFromResponse;
            }
          } else {
            console.log('❌ NameStone API error response:', response.status, response.statusText);
            const errorText = await response.text();
            console.log('❌ Error details:', errorText);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch from ${endpoint}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to get ENS from NameStone:', error);
    }

    // Final fallback: Direct World ID API lookup
    try {
      console.log('🔄 Trying World ID direct lookup...');
      const worldIdResp = await fetch(`https://bridge.worldcoin.org/v1/id/${address.toLowerCase()}`);
      if (worldIdResp.ok) {
        const worldIdData = await worldIdResp.json();
        console.log('📦 World ID API data:', JSON.stringify(worldIdData, null, 2));
        if (worldIdData?.username) {
          const worldIdDomain = `${worldIdData.username}.world.id`;
          console.log('✅ Found World ID domain:', worldIdDomain);
          return worldIdDomain;
        }
      }
    } catch (e) {
      console.error('❌ Failed World ID API lookup:', e);
    }
    
    try {
      // Final fallback: Try reverse ENS lookup for regular ENS
      console.log('🔄 Trying web3.bio fallback...');
      const response = await fetch(`https://api.web3.bio/profile/${address}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Web3.bio data:', data);
        if (data.ens) {
          console.log('✅ Found ENS from web3.bio:', data.ens);
          return data.ens;
        }
      }
    } catch (error) {
      console.error('❌ Failed to get ENS from web3.bio:', error);
    }
    
    console.log('❌ No ENS/domain name found for address:', address);
    return undefined;
  };

  // Helper method to extract domain from various response formats
  const extractDomainFromResponse = (data: any): string | undefined => {
    // Check if the response has names array
    if (data && Array.isArray(data.names) && data.names.length > 0) {
      console.log('✅ Found names array:', data.names);
      
      // Priority 1: Look for .world.id domains (World ID domains) 
      const worldIdDomain = data.names.find((nameObj: any) => {
        const name = nameObj?.name || nameObj?.domain || nameObj;
        return typeof name === 'string' && name.endsWith('.world.id');
      });
      
      if (worldIdDomain) {
        const domainName = worldIdDomain.name || worldIdDomain.domain || worldIdDomain;
        console.log('🆔 Found .world.id domain:', domainName);
        return domainName;
      }
      
      // Priority 2: Look for .world domains
      const worldDomain = data.names.find((nameObj: any) => {
        const name = nameObj?.name || nameObj?.domain || nameObj;
        return typeof name === 'string' && name.endsWith('.world');
      });
      
      if (worldDomain) {
        const domainName = worldDomain.name || worldDomain.domain || worldDomain;
        console.log('🌍 Found .world domain:', domainName);
        return domainName;
      }
      
      // Priority 3: Look for primary domain
      const primaryDomain = data.names.find((nameObj: any) =>
        nameObj.primary || nameObj.isPrimary || nameObj.is_primary
      );
      
      if (primaryDomain) {
        const domainName = primaryDomain.name || primaryDomain.domain || primaryDomain;
        console.log('⭐ Found primary domain:', domainName);
        return domainName;
      }
      
      // Priority 4: Return the first available name as fallback
      const firstNameObj = data.names[0];
      const firstDomainName = firstNameObj?.name || firstNameObj?.domain || firstNameObj;
      if (typeof firstDomainName === 'string' && firstDomainName.length > 0) {
        console.log('📝 Using first available name:', firstDomainName);
        return firstDomainName;
      }
    }
    
    // Handle case where data.names is not an array but data itself contains domain info
    if (data && typeof data === 'object' && !Array.isArray(data.names)) {
      const directName = data.name || data.domain || data.domain?.name;
      if (typeof directName === 'string' && directName.length > 0) {
        console.log('📝 Found direct domain name:', directName);
        return directName;
      }
    }
    
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