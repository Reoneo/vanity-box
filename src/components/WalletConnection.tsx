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

  // Auto-prompt World App wallet connect on page load (once)
  const autoAuthAttempted = React.useRef(false);
  useEffect(() => {
    if (!autoAuthAttempted.current && MiniKit.isInstalled() && !user) {
      autoAuthAttempted.current = true;
      setTimeout(() => {
        handleConnect();
      }, 300);
    }
  }, [user]);

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
    // Reset auto-auth flag so the prompt shows again on next connect
    autoAuthAttempted.current = false;
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
        className={cn("h-10 bg-transparent border-border text-foreground hover:bg-muted/50", className)}
      >
        {isLoading ? 'Connecting...' : 'Connect'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-10 px-3 gap-2 bg-transparent border-border text-foreground hover:bg-muted/50", className)}
        >
          <span className="font-medium">
            {user.username || 'Connected'}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <p className="text-sm font-medium">{user.username || 'Connected'}</p>
          <p className="text-xs text-muted-foreground">{formatAddress(user.walletAddress || '')}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};