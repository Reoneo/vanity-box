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
      
      // Use the official World App wallet auth that shows the native modal
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: generateNonce(),
        requestId: 'vanity-box-auth-' + Date.now(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        notBefore: new Date(Date.now() - 60 * 1000), // 1 minute ago
        statement: 'Sign in to Vanity.₿ox'
      });

      console.log('📦 Wallet auth response:', { commandPayload, finalPayload });

      if (finalPayload?.status === 'success' && finalPayload.address) {
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
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('❌ Error during wallet authentication:', error);
      alert('Failed to connect wallet. Please try again.');
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
      // Try to fetch World Chain ENS from NameStone API
      const response = await fetch(`https://namestone.com/api/public_v1/get-names?address=${address}`);
      console.log('📡 NameStone API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 NameStone API data:', data);
        
        if (data.names && data.names.length > 0) {
          console.log('✅ Found names:', data.names);
          
          // Look for primary domain first
          const primaryDomain = data.names.find((name: any) =>
            name.primary || name.isPrimary || name.is_primary
          );
          
          if (primaryDomain) {
            console.log('⭐ Found primary domain:', primaryDomain.name);
            return primaryDomain.name;
          }
          
          // Look for .world.id domains first (World ID domains)
          const worldIdDomain = data.names.find((name: any) =>
            name.name && name.name.includes('.world.id')
          );
          
          if (worldIdDomain) {
            console.log('🆔 Found .world.id domain:', worldIdDomain.name);
            return worldIdDomain.name;
          }
          
          // Look for .world domains
          const worldDomain = data.names.find((name: any) =>
            name.name && name.name.endsWith('.world')
          );
          
          if (worldDomain) {
            console.log('🌍 Found .world domain:', worldDomain.name);
            return worldDomain.name;
          }
          
          // Return the first available name as fallback
          const primaryName = data.names[0].name;
          console.log('📝 Using primary name:', primaryName);
          return primaryName;
        }
      }
    } catch (error) {
      console.error('❌ Failed to get ENS from NameStone:', error);
    }

    // Additional fallback: try NameStone get-domain endpoint
    try {
      const resp = await fetch(`https://namestone.com/api/public_v1/get-domain?address=${address}`);
      console.log('📡 NameStone get-domain status:', resp.status);
      if (resp.ok) {
        const domainData = await resp.json();
        console.log('📦 NameStone get-domain data:', domainData);
        const name = domainData?.domain?.name || domainData?.name;
        if (typeof name === 'string' && name.length > 0) {
          return name;
        }
      }
    } catch (e) {
      console.error('❌ Failed NameStone get-domain fallback:', e);
    }
    
    try {
      // Fallback: Try reverse ENS lookup for regular ENS
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
    
    console.log('❌ No ENS name found for address:', address);
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
          className={cn("h-10 px-4 gap-3 bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800 transition-all duration-300 font-semibold", className)}
        >
          {/* User avatar placeholder */}
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <span className="text-xs font-bold text-black">
              {user.username ? user.username.charAt(0).toUpperCase() : user.walletAddress?.charAt(2).toUpperCase()}
            </span>
          </div>
          <span className="font-bold truncate max-w-32">
            {user.username || formatAddress(user.walletAddress || '')}
          </span>
          <ChevronDown className="w-4 h-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-gray-900 border-2 border-[#D4AF37]/30 shadow-2xl">
        <div className="px-4 py-3 bg-gradient-to-r from-[#D4AF37]/5 to-[#F7E06C]/5">
          <p className="text-base font-bold text-[#D4AF37]">{user.username || 'Connected Wallet'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{formatAddress(user.walletAddress || '')}</p>
          {user.username && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">ENS Domain Connected</p>
          )}
        </div>
        <DropdownMenuSeparator className="bg-[#D4AF37]/20" />
        <DropdownMenuItem className="hover:bg-[#D4AF37]/10 cursor-pointer">
          <User className="w-4 h-4 mr-3 text-[#D4AF37]" />
          <span className="font-medium">Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#D4AF37]/20" />
        <DropdownMenuItem onClick={handleDisconnect} className="text-red-600 dark:text-red-400 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
          <LogOut className="w-4 h-4 mr-3" />
          <span className="font-medium">Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};