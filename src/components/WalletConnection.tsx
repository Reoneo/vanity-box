import React, { useState, useEffect } from 'react';
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput, VerificationLevel } from '@worldcoin/minikit-js';
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
    if (!MiniKit.isInstalled()) {
      // Running outside World App - this is expected in development
      return;
    }

    // Initialize MiniKit when running in World App
    MiniKit.install();
  }, []);

  const handleConnect = async () => {
    if (!MiniKit.isInstalled()) {
      alert('Please open this app in World App');
      return;
    }

    setIsLoading(true);
    try {
      const nonce = generateNonce();
      const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      const response = await MiniKit.commandsAsync.walletAuth({
        nonce,
        requestId: 'auth-request',
        expirationTime,
        notBefore: new Date(),
        statement: 'Connect to Vanity.₿ox to manage your Web3 identity'
      });

      if (response.finalPayload && 'address' in response.finalPayload) {
        const userData = {
          walletAddress: response.finalPayload.address,
          username: response.finalPayload.address ? getENSName(response.finalPayload.address) : undefined
        };
        setUser(userData);
      } else {
        console.error('Authentication failed:', response);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
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