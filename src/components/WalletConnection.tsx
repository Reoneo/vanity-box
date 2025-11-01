import React, { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { usePrivy, useLoginWithSiwe } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { setAuthToken } from '@/lib/supaInvoke';

interface WalletConnectionProps {
  className?: string;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({ className }) => {
  const { t } = useLanguage();
  const { ready, authenticated, user: privyUser, logout, getAccessToken } = usePrivy();
  const { generateSiweNonce, loginWithSiwe } = useLoginWithSiwe();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState<string | undefined>();

  useEffect(() => {
    // Fetch World ID username when user is authenticated
    if (authenticated && privyUser?.wallet?.address) {
      getWorldChainENS(privyUser.wallet.address).then(setUsername);
    }
  }, [authenticated, privyUser]);

  // Update auth token when authentication state changes
  useEffect(() => {
    const updateToken = async () => {
      if (authenticated) {
        try {
          const token = await getAccessToken();
          setAuthToken(token);
          console.log('[WalletConnection] Auth token set for edge function calls');
        } catch (error) {
          console.error('[WalletConnection] Failed to get access token:', error);
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }
    };
    
    updateToken();
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    // Listen for wallet connection trigger from search
    const handleTriggerConnect = () => {
      if (!authenticated) {
        handleConnect();
      }
    };

    window.addEventListener('trigger-wallet-connect', handleTriggerConnect);
    return () => {
      window.removeEventListener('trigger-wallet-connect', handleTriggerConnect);
    };
  }, [authenticated]);

  // Dispatch wallet events when auth state changes
  useEffect(() => {
    if (authenticated && privyUser?.wallet?.address) {
      window.dispatchEvent(new CustomEvent('wallet-connected', { 
        detail: { 
          walletAddress: privyUser.wallet.address,
          username 
        } 
      }));
    }
  }, [authenticated, privyUser, username]);

  const handleConnect = async () => {
    // Check if running in World App
    if (!MiniKit.isInstalled()) {
      console.log('Not in World App - redirecting to World App ecosystem page');
      window.open('https://world.org/ecosystem/app_ed7e61cb0c52630464178eed59e3fbdd', '_blank');
      return;
    }

    if (!ready) {
      toast.error('Privy is not ready yet. Please wait a moment.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Starting SIWE authentication with Privy + World App...');
      
      // Step 1: Get nonce from Privy
      const privyNonce = await generateSiweNonce();
      console.log('✅ Generated Privy nonce');

      // Step 2: Pass nonce to Worldcoin walletAuth
      const authParams = {
        nonce: privyNonce,
        requestId: 'vanity-box-auth-' + Date.now(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        notBefore: new Date(Date.now() - 60 * 1000), // 1 minute ago
        statement: 'Sign in to Vanity.box to access your World ID domains and personalized features.'
      };

      console.log('📱 Requesting wallet signature from World App...');
      const result = await MiniKit.commandsAsync.walletAuth(authParams);
      const { finalPayload } = result;

      console.log('📦 Received wallet auth response');

      if (finalPayload?.status !== 'success' || !finalPayload.message || !finalPayload.signature) {
        throw new Error('Wallet authentication failed - no signature received');
      }

      // Step 3: Send signed message and signature to Privy
      console.log('🔐 Verifying signature with Privy...');
      await loginWithSiwe({ 
        message: finalPayload.message, 
        signature: finalPayload.signature 
      });

      console.log('✅ Successfully authenticated with Privy SIWE!');
      toast.success('Wallet connected successfully!');

    } catch (error) {
      console.error('❌ Error during SIWE authentication:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to connect wallet: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    logout();
    setUsername(undefined);
    setAuthToken(null); // Clear auth token
    sessionStorage.setItem('skipAutoAuth', '1');
    
    // Remove backdrop when disconnecting
    const backdrop = document.getElementById('wallet-dropdown-backdrop');
    if (backdrop) backdrop.remove();
    document.body.style.overflow = '';
    
    // Dispatch event for Index component
    window.dispatchEvent(new CustomEvent('wallet-disconnected'));
    toast.success('Wallet disconnected');
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

    // Try MiniKit
    try {
      const mkAny = MiniKit as any;
      if (mkAny?.getUserByAddress) {
        const worldIdUser = await mkAny.getUserByAddress(address);
        const mkDomain = normalize(worldIdUser?.username || worldIdUser?.handle || worldIdUser?.name);
        if (mkDomain) {
          sessionStorage.setItem(cacheKey, mkDomain);
          return mkDomain;
        }
      }
    } catch (e) {
      console.error('❌ MiniKit username lookup failed:', e);
    }

    // Try World Bridge API
    try {
      const worldBridgeResp = await fetch(`https://usernames.worldcoin.org/v1/addresses/${address.toLowerCase()}`);
      if (worldBridgeResp.ok) {
        const data = await worldBridgeResp.json();
        const bridgeDomain = normalize(data?.username || data?.handle || data?.name);
        if (bridgeDomain) {
          sessionStorage.setItem(cacheKey, bridgeDomain);
          return bridgeDomain;
        }
      }
    } catch (e) {
      console.error('❌ World usernames service lookup failed:', e);
    }

    return undefined;
  };

  const formatAddress = (address: string): string => {
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  if (!authenticated || !privyUser) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isLoading || !ready}
        variant="outline"
        size="sm"
        className={cn("relative h-10 bg-black text-white border-0 hover:bg-gray-800 transition-all duration-300 font-semibold before:absolute before:inset-0 before:rounded-md before:border-2 before:border-[#D4AF37] before:animate-pulse before:pointer-events-none", className)}
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

  const displayName = username || formatAddress(privyUser.wallet?.address || '');

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
            {displayName}
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
