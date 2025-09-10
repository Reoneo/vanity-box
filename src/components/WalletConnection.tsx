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

  const handleConnect = async () => {
    if (!MiniKit.isInstalled()) {
      console.warn('MiniKit is not installed. This app should be opened in World App.');
      // For development/testing purposes, show a more user-friendly message
      if (window.confirm('This app works best when opened in World App. Would you like to continue anyway for testing?')) {
        // Mock authentication for testing outside World App
        const mockUser = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          username: undefined
        };
        setUser(mockUser);
      }
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
        const userData = {
          walletAddress: finalPayload.address,
          username: finalPayload.address ? getENSName(finalPayload.address) : undefined
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

  const getENSName = (address: string): string => {
    // Placeholder for ENS resolution - in a real app, you'd use ENS resolver
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  const formatAddress = (address: string): string => {
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  if (!user) {
    return (
      <Button
        variant="connect"
        size="default"
        onClick={handleConnect}
        disabled={isLoading}
        className={cn("shadow-lg hover:shadow-primary/25", className)}
      >
        <Wallet className="w-4 h-4" />
        {isLoading ? 'Connecting...' : 'Connect'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="subtle"
          className={cn("h-10 px-3 gap-2", className)}
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {user.username?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
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