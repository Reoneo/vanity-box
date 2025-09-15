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
      const nonce = generateNonce();
      const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      
      console.log('🔄 Initiating wallet authentication...');
      
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        requestId: 'vanity-box-auth',
        expirationTime,
        notBefore,
        statement: 'Connect to Vanity.₿ox to manage your Web3 identity'
      });

      console.log('📦 Wallet auth response:', { commandPayload, finalPayload });

      if (finalPayload && 'address' in finalPayload) {
        const ensName = await getWorldChainENS(finalPayload.address);
        const userData = {
          walletAddress: finalPayload.address,
          username: ensName
        };
        setUser(userData);
        console.log('✅ User authenticated successfully:', userData);
      } else {
        console.error('❌ Authentication failed - no address in response:', { commandPayload, finalPayload });
        throw new Error('Authentication failed: No address returned');
      }
    } catch (error) {
      console.error('❌ Error during wallet authentication:', error);
      // Show user-friendly error
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setUser(null);
  };

  const generateNonce = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const getWorldChainENS = async (address: string): Promise<string | undefined> => {
    try {
      // Try to fetch World Chain ENS from NameStone API
      const response = await fetch(`https://api.namestone.com/api/public_v1/get-names?address=${address}`);
      if (response.ok) {
        const data = await response.json();
        if (data.names && data.names.length > 0) {
          // Return the first World Chain domain found
          const worldChainDomainPreferred = data.names.find((name: any) =>
            name.domain && (name.domain.includes('.world.id') || name.name?.includes('.world.id'))
          );
          const worldChainDomainFallback = worldChainDomainPreferred || data.names.find((name: any) =>
            name.domain && (name.domain.includes('worldchain') || name.domain.includes('.world'))
          );
          if (worldChainDomainFallback) {
            return worldChainDomainFallback.name;
          }
          // Fallback to first available name
          return data.names[0].name;
        }
      }
    } catch (error) {
      console.warn('Failed to get World Chain ENS from NameStone:', error);
    }
    
    try {
      // Fallback: Try reverse ENS lookup for regular ENS
      const response = await fetch(`https://api.web3.bio/profile/${address}`);
      if (response.ok) {
        const data = await response.json();
        if (data.ens) {
          return data.ens;
        }
      }
    } catch (error) {
      console.warn('Failed to get ENS name from web3.bio:', error);
    }
    
    // No ENS name found
    return undefined;
  };

  const formatAddress = (address: string): string => {
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  if (!user) {
    return (
      <button
        onClick={handleConnect}
        disabled={isLoading}
        aria-label="Connect wallet"
        className={cn("p-0 border-0 bg-transparent text-foreground hover:opacity-70 transition-opacity", className)}
      >
        <Wallet className="w-5 h-5" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="subtle"
          className={cn("h-10 px-3 gap-2 bg-white/20 text-white hover:bg-white/30 border border-white/30 backdrop-blur-sm", className)}
        >
          <span className="font-medium">
            {user.username || formatAddress(user.walletAddress || '')}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <p className="text-sm font-medium">{user.username || 'Anonymous'}</p>
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