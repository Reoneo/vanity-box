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
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface User {
  walletAddress?: string;
  username?: string;
}

interface WalletConnectionProps {
  className?: string;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({ className }) => {
  const { t } = useLanguage();
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

    // Listen for wallet connection trigger from search
    const handleTriggerConnect = () => {
      if (!user) {
        handleConnect();
      }
    };

    window.addEventListener('trigger-wallet-connect', handleTriggerConnect);
    return () => {
      window.removeEventListener('trigger-wallet-connect', handleTriggerConnect);
    };
  }, [user]);

  // Remove auto-connect - users must manually connect

  const handleConnect = async () => {
    // Check if running in World App
    if (!MiniKit.isInstalled()) {
      console.log('Not in World App - redirecting to World App ecosystem page');
      window.open('https://world.org/ecosystem/app_ed7e61cb0c52630464178eed59e3fbdd', '_blank');
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
        statement: 'Sign in to Vanity.box to access your World ID domains and personalized features.'
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
    
    // Remove backdrop when disconnecting
    const backdrop = document.getElementById('wallet-dropdown-backdrop');
    if (backdrop) backdrop.remove();
    document.body.style.overflow = '';
    
    // Dispatch event for Index component
    window.dispatchEvent(new CustomEvent('wallet-disconnected'));
  };

  const generateNonce = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const getWorldChainENS = async (address: string): Promise<string | undefined> => {
    console.log('🔍 Fetching World ID ENS for address:', address);

    const normalize = (u?: string | null): string | undefined => {
      if (!u) return undefined;
      const lower = String(u).toLowerCase();
      return lower.endsWith('.world.id') ? lower : `${lower}.world.id`;
    };
    
    // Check cache first
    const cacheKey = `worldid_domain_${address.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ Using cached domain:', cached);
      return cached;
    }

    // Primary: ask World App via MiniKit
    try {
      // 1) Explicit fetch using MiniKit.getUserByAddress if available
      const mkAny = MiniKit as any;
      if (mkAny?.getUserByAddress) {
        console.log('🌍 Using MiniKit.getUserByAddress...');
        const worldIdUser = await mkAny.getUserByAddress(address);
        const mkDomain = normalize(worldIdUser?.username || worldIdUser?.handle || worldIdUser?.name);
        if (mkDomain) {
          sessionStorage.setItem(cacheKey, mkDomain);
          console.log('✅ Found username from MiniKit.getUserByAddress:', mkDomain);
          return mkDomain;
        }
      }
      // 2) Try MiniKit.user if populated after auth
      const inlineUsername = (MiniKit as any)?.user?.username;
      const inlineDomain = normalize(inlineUsername);
      if (inlineDomain) {
        sessionStorage.setItem(cacheKey, inlineDomain);
        console.log('✅ Found username from MiniKit.user:', inlineDomain);
        return inlineDomain;
      }
    } catch (e) {
      console.error('❌ MiniKit username lookup failed:', e);
    }

    // Secondary: World Bridge API for World ID username
    try {
      console.log('🌐 Fetching from World Bridge API...');
      const worldBridgeResp = await fetch(`https://usernames.worldcoin.org/v1/addresses/${address.toLowerCase()}`);
      // usernames service: also try legacy bridge endpoint as fallback
      if (worldBridgeResp.ok) {
        const data = await worldBridgeResp.json();
        // Common shapes: { username: 'reon.0000' } or { handle: 'reon.0000' }
        const bridgeDomain = normalize(data?.username || data?.handle || data?.name);
        if (bridgeDomain) {
          sessionStorage.setItem(cacheKey, bridgeDomain);
          console.log('✅ Found username from usernames service:', bridgeDomain);
          return bridgeDomain;
        }
      }
    } catch (e) {
      console.error('❌ World usernames service lookup failed:', e);
    }

    // Tertiary: Legacy Bridge endpoint
    try {
      console.log('🔄 Trying legacy World Bridge endpoint...');
      const legacyResp = await fetch(`https://bridge.worldcoin.org/v1/id/${address.toLowerCase()}`);
      if (legacyResp.ok) {
        const legacyData = await legacyResp.json();
        const legacyDomain = normalize(legacyData?.username || legacyData?.handle);
        if (legacyDomain) {
          sessionStorage.setItem(cacheKey, legacyDomain);
          console.log('✅ Found legacy World Bridge username:', legacyDomain);
          return legacyDomain;
        }
      }
    } catch (e) {
      console.error('❌ Legacy World Bridge lookup failed:', e);
    }

    // Retry MiniKit inline user after small delay (in case auth just populated it)
    try {
      console.log('⏳ Retrying MiniKit.user after delay...');
      await new Promise((r) => setTimeout(r, 1200));
      const retryInline = normalize((MiniKit as any)?.user?.username);
      if (retryInline) {
        sessionStorage.setItem(cacheKey, retryInline);
        console.log('✅ Found username on retry:', retryInline);
        return retryInline;
      }
    } catch (e) {
      console.error('❌ Retry MiniKit.user failed:', e);
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
        className={cn("relative h-10 bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800 transition-all duration-300 font-semibold before:absolute before:inset-0 before:rounded-md before:border-2 before:border-[#D4AF37] before:animate-pulse before:pointer-events-none", className)}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            {t('connecting')}
          </>
        ) : (
          t('Connect')
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open) {
        document.body.style.overflow = 'hidden';
        const backdrop = document.createElement('div');
        backdrop.id = 'wallet-dropdown-backdrop';
        backdrop.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]';
        document.body.appendChild(backdrop);
      } else {
        document.body.style.overflow = '';
        const backdrop = document.getElementById('wallet-dropdown-backdrop');
        if (backdrop) backdrop.remove();
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-10 px-4 bg-black text-white border-2 border-black hover:bg-black hover:border-black hover:text-white transition-all duration-300 font-semibold", className)}
        >
          <span className="font-bold text-white truncate max-w-48">
            {user.username || formatAddress(user.walletAddress || '')}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg mt-2 z-[10000]">
        <DropdownMenuItem 
          className="text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('show-my-ids'));
            const backdrop = document.getElementById('wallet-dropdown-backdrop');
            if (backdrop) backdrop.remove();
            document.body.style.overflow = '';
          }}
        >
          <User className="mr-2 h-4 w-4" />
          My ID's
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
          onClick={handleDisconnect}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};