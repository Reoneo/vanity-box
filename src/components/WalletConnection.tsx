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
    console.log('🔍 Fetching World ID ENS for address:', address);
    
    // Check cache first
    const cacheKey = `worldid_domain_${address.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ Using cached domain:', cached);
      return cached;
    }
    
    try {
      // Primary: World Bridge API for World ID username
      console.log('🌍 Fetching from World Bridge API...');
      const worldBridgeResp = await fetch(`https://bridge.worldcoin.org/v1/id/${address.toLowerCase()}`);
      
      if (worldBridgeResp.ok) {
        const worldBridgeData = await worldBridgeResp.json();
        console.log('📦 World Bridge response:', JSON.stringify(worldBridgeData, null, 2));
        
        if (worldBridgeData?.username) {
          const worldIdDomain = `${worldBridgeData.username}.world.id`;
          sessionStorage.setItem(cacheKey, worldIdDomain);
          console.log('✅ Found World ID domain:', worldIdDomain);
          return worldIdDomain;
        }
      } else {
        console.log('❌ World Bridge API error:', worldBridgeResp.status, worldBridgeResp.statusText);
      }
    } catch (e) {
      console.error('❌ Failed World Bridge lookup:', e);
    }

    try {
      // Secondary: World Chain API (alternative endpoint)
      console.log('🔄 Trying World Chain API...');
      const worldChainResp = await fetch(`https://api.worldcoin.org/v1/profile/${address.toLowerCase()}`);
      
      if (worldChainResp.ok) {
        const worldChainData = await worldChainResp.json();
        console.log('📦 World Chain response:', JSON.stringify(worldChainData, null, 2));
        
        if (worldChainData?.username || worldChainData?.world_id) {
          const username = worldChainData.username || worldChainData.world_id;
          const worldIdDomain = `${username}.world.id`;
          sessionStorage.setItem(cacheKey, worldIdDomain);
          console.log('✅ Found World Chain domain:', worldIdDomain);
          return worldIdDomain;
        }
      }
    } catch (e) {
      console.error('❌ Failed World Chain lookup:', e);
    }

    try {
      // Tertiary: World ID API direct lookup
      console.log('🔄 Trying World ID API...');
      const worldIdResp = await fetch(`https://id.worldcoin.org/api/v1/profile/${address.toLowerCase()}`);
      
      if (worldIdResp.ok) {
        const worldIdData = await worldIdResp.json();
        console.log('📦 World ID API response:', JSON.stringify(worldIdData, null, 2));
        
        if (worldIdData?.username || worldIdData?.handle) {
          const username = worldIdData.username || worldIdData.handle;
          const worldIdDomain = `${username}.world.id`;
          sessionStorage.setItem(cacheKey, worldIdDomain);
          console.log('✅ Found World ID API domain:', worldIdDomain);
          return worldIdDomain;
        }
      }
    } catch (e) {
      console.error('❌ Failed World ID API lookup:', e);
    }

    // Retry World Bridge after delay for slow indexing
    try {
      console.log('🔄 Retrying World Bridge after delay...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const retryResp = await fetch(`https://bridge.worldcoin.org/v1/id/${address.toLowerCase()}`);
      if (retryResp.ok) {
        const retryData = await retryResp.json();
        console.log('📦 World Bridge retry response:', JSON.stringify(retryData, null, 2));
        
        if (retryData?.username) {
          const worldIdDomain = `${retryData.username}.world.id`;
          sessionStorage.setItem(cacheKey, worldIdDomain);
          console.log('✅ Found World ID domain on retry:', worldIdDomain);
          return worldIdDomain;
        }
      }
    } catch (e) {
      console.error('❌ Failed World Bridge retry:', e);
    }
    
    console.log('❌ No World ID domain found for address:', address);
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