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

// Cache for ENS names to avoid repeated API calls
const ensCache = new Map<string, string>();

// LocalStorage cache helpers (persist across sessions)
const nameCacheKey = (addr: string) => `ns:name:${addr.toLowerCase()}`;
const getNameFromStorage = (addr: string): string | null => {
  try { return localStorage.getItem(nameCacheKey(addr)); } catch { return null; }
};
const setNameInStorage = (addr: string, name: string) => {
  try { localStorage.setItem(nameCacheKey(addr), name); } catch {}
};

export const WalletConnection: React.FC<WalletConnectionProps> = ({ className }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingName, setIsFetchingName] = useState(false);

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
        const addr = finalPayload.address;
        // Try local cache immediately to avoid any placeholder text
        const cachedName = getNameFromStorage(addr);
        const userData = {
          walletAddress: addr,
          username: cachedName ?? undefined,
        };
        setUser(userData);
        console.log('✅ User authenticated successfully:', userData);
        // Fetch ENS/World ID name in background to refresh cache
        fetchAndUpdateENS(addr);
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

  const fetchAndUpdateENS = async (address: string) => {
    const addr = address.toLowerCase();
    // Check in-memory cache first
    if (ensCache.has(addr)) {
      const cachedName = ensCache.get(addr);
      setUser(prev => (prev ? { ...prev, username: cachedName } : null));
      return;
    }
    // Check localStorage cache next
    const stored = getNameFromStorage(addr);
    if (stored) {
      ensCache.set(addr, stored);
      setUser(prev => (prev ? { ...prev, username: stored } : null));
      // Continue to refresh in background
    }
    setIsFetchingName(true);
    try {
      const ensName = await getWorldChainENS(addr);
      if (ensName) {
        ensCache.set(addr, ensName);
        setNameInStorage(addr, ensName);
        setUser(prev => (prev ? { ...prev, username: ensName } : null));
      }
    } finally {
      setIsFetchingName(false);
    }
  };

  const getWorldChainENS = async (address: string): Promise<string | undefined> => {
    console.log('🔍 Fetching ENS for address:', address);
    const addr = address.toLowerCase();
    try {
      const res = await fetch(`https://namestone.com/api/public_v1/get-names?address=${addr}`);
      console.log('📡 NameStone API response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('📦 NameStone API data:', data);
        // 1) Root-level primary
        const primaryRoot = (data?.primary && (data.primary.name || data.primary)) as string | undefined;
        if (primaryRoot && typeof primaryRoot === 'string') {
          return primaryRoot;
        }
        const names: any[] = Array.isArray(data?.names) ? data.names : [];
        if (names.length) {
          // 2) Primary within names
          const primaryEntry = names.find((n) => n?.primary || n?.isPrimary || n?.is_primary || n?.isPrimaryForDomain);
          if (primaryEntry?.name) return primaryEntry.name as string;
          // 3) Prefer .world.id
          const worldId = names.find((n) => typeof n?.name === 'string' && n.name.endsWith('.world.id'));
          if (worldId?.name) return worldId.name as string;
          // 4) Then .world
          const world = names.find((n) => typeof n?.name === 'string' && n.name.endsWith('.world'));
          if (world?.name) return world.name as string;
          // 5) Fallback: first
          if (typeof names[0]?.name === 'string') return names[0].name as string;
        }
      }
    } catch (error) {
      console.error('❌ Failed to get ENS from NameStone:', error);
    }
    try {
      // Fallback: Try reverse ENS lookup for regular ENS
      console.log('🔄 Trying web3.bio fallback...');
      const response = await fetch(`https://api.web3.bio/profile/${addr}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Web3.bio data:', data);
        if (data?.ens) return data.ens as string;
      }
    } catch (error) {
      console.error('❌ Failed to get ENS from web3.bio:', error);
    }
    console.log('❌ No ENS name found for address:', addr);
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
          <p className="text-sm font-medium">
            {user.username || 'Connected'}
          </p>
          <p className="text-xs text-muted-foreground">{user.walletAddress ? formatAddress(user.walletAddress) : ''}</p>
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