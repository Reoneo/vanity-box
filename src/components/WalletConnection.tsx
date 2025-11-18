import React, { useState, useEffect } from 'react';
import { callEdge } from '@/lib/supaInvoke';
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
import wldLogo from '@/assets/wld-logo.png';
import tonLogo from '@/assets/ton-logo.png';
import petraIcon from '@/assets/petra-icon.png';
import { isTelegramWebView, getTelegramUser } from '@/lib/telegram';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { connectTonWallet as tonConnectWallet } from '@/lib/tonConnect';
import { usePetraWallet } from '@/hooks/use-petra-wallet';
import { toast } from 'sonner';

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
  const [tonConnectUI] = useTonConnectUI();
  const { account: petraAccount, network: petraNetwork, isConnected: petraConnected, connect: connectPetra, disconnect: disconnectPetra } = usePetraWallet();
  const [walletType, setWalletType] = useState<'worldchain' | 'petra' | null>(null);
  const [aptBalance, setAptBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState<string>('mainnet');

  // Helper to format balance with proper decimals
  const formatBalance = (value: number, decimals = 6): string => {
    if (!isFinite(value) || value <= 0) return "0";
    const threshold = Math.pow(10, -decimals);
    if (value < threshold) return `<${threshold.toFixed(decimals)}`;
    return value.toFixed(decimals);
  };


  useEffect(() => {
    // Check Petra wallet connection and network changes
    if (petraConnected && petraAccount) {
      setWalletType('petra');
      const networkName = petraNetwork?.name?.toLowerCase() || 'mainnet';
      setActiveNetwork(networkName);
      // Dispatch event to notify Header about Petra connection
      window.dispatchEvent(new CustomEvent('wallet-connected', { 
        detail: { walletType: 'petra' } 
      }));
      // Fetch balance when Petra connects or network changes
      fetchAptosBalance();
    }
  }, [petraConnected, petraAccount, petraNetwork]);

  useEffect(() => {
    // Check environment on mount
    console.log('🌍 Environment check on mount:');
    console.log('  - Telegram WebView:', isTelegramWebView());
    console.log('  - World App:', MiniKit.isInstalled());
    console.log('  - User Agent:', navigator.userAgent.substring(0, 150));

    // Listen for wallet connection trigger from search
    const handleTriggerConnect = () => {
      if (!user && !petraConnected) {
        // Prioritize Telegram if in Telegram environment
        if (isTelegramWebView()) {
          console.log('🔄 Trigger: Connecting via Telegram');
          handleTelegramConnect();
        } else {
          console.log('🔄 Trigger: Connecting via World App');
          handleConnect();
        }
      }
    };

    window.addEventListener('trigger-wallet-connect', handleTriggerConnect);
    return () => {
      window.removeEventListener('trigger-wallet-connect', handleTriggerConnect);
    };
  }, [user, petraConnected, petraAccount]);

  // Remove auto-connect - users must manually connect

  // Fetch Aptos balance with network awareness
  const fetchAptosBalance = async () => {
    if (!petraAccount?.address) return;
    
    setBalanceLoading(true);
    const networkName = petraNetwork?.name?.toLowerCase() || 'mainnet';
    const network = (networkName === 'testnet' || networkName === 'devnet') ? networkName : 'mainnet';
    
    try {
      console.log(`[WalletConnection] Fetching balance for ${petraAccount.address} on ${network}`);
      const balanceData = await callEdge<any>("get-aptos-balance", {
        address: petraAccount.address,
        network,
      });

      if (balanceData.success) {
        setAptBalance(balanceData.aptBalance || 0);
        setUsdcBalance(balanceData.usdcBalance || 0);
        setActiveNetwork(network);
      }
    } catch (error) {
      console.error("[Aptos] Failed to load balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleConnect = async () => {
    // If Petra is already connected, just return
    if (petraConnected) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if running in World App - with enhanced detection
      const hasWorldApp = typeof (window as any).WorldApp !== "undefined";
      const hasWorldAppUA = navigator.userAgent.includes("World App") || navigator.userAgent.includes("WorldApp");
      const isInstalled = MiniKit.isInstalled();
      
      console.log('🔍 World App detection:', { hasWorldApp, hasWorldAppUA, isInstalled });
      
      if (!isInstalled && !hasWorldApp && !hasWorldAppUA) {
        console.log('Not in World App - redirecting to World App ecosystem page');
        setIsLoading(false);
        window.open('https://world.org/ecosystem/app_ed7e61cb0c52630464178eed59e3fbdd', '_blank');
        return;
      }
      
      // If we detect World App but MiniKit isn't installed, try to wait for it
      if ((hasWorldApp || hasWorldAppUA) && !isInstalled) {
        console.log('⏳ World App detected, waiting for MiniKit to initialize...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check again after waiting
        if (!MiniKit.isInstalled()) {
          console.warn('⚠️ MiniKit still not ready, but proceeding anyway since we detected World App');
        }
      }

      console.log('🔄 Initiating wallet authentication with World App native UI...');
      
      const nonce = generateNonce();
      console.log('🎲 Generated nonce:', nonce);
      
      const authParams = {
        nonce,
        requestId: 'vanity-box-auth-' + Date.now(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now() - 60 * 1000),
        statement: 'Sign in to Vanity.box to access your World ID domains and personalized features.'
      };
      
      console.log('📝 Auth parameters:', authParams);
      
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
        setWalletType('worldchain');
        sessionStorage.removeItem('skipAutoAuth');
        
        // Dispatch event for Index component
        window.dispatchEvent(new CustomEvent('wallet-connected', { detail: { ...userData, walletType: 'worldchain' } }));
        
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

  const handleTelegramConnect = async () => {
    // Check if in Telegram WebView
    if (isTelegramWebView()) {
      try {
        setIsLoading(true);
        console.log('🔄 Connecting TON wallet in Telegram mini app...');
        
        // Check if already connected
        if (tonConnectUI.wallet) {
          const userData = {
            walletAddress: tonConnectUI.wallet.account.address,
            username: formatAddress(tonConnectUI.wallet.account.address)
          };
          setUser(userData);
          setWalletType('worldchain');
          window.dispatchEvent(new CustomEvent('wallet-connected', { detail: userData }));
          setIsLoading(false);
          toast.success('TON wallet connected!');
          return;
        }

        // Use connectWallet() for Telegram mini apps instead of openModal()
        // This triggers the native Telegram wallet picker
        const walletInfo = await tonConnectUI.connectWallet();
        
        if (tonConnectUI.wallet) {
          const userData = {
            walletAddress: tonConnectUI.wallet.account.address,
            username: formatAddress(tonConnectUI.wallet.account.address)
          };
          setUser(userData);
          setWalletType('worldchain');
          
          window.dispatchEvent(new CustomEvent('wallet-connected', { 
            detail: userData
          }));
          
          console.log('✅ TON wallet connected:', userData);
          toast.success('TON wallet connected!');
        } else {
          throw new Error('No wallet connected after connection attempt');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('❌ TON wallet connection failed:', error);
        setIsLoading(false);
        
        // Only show error if it's not a user cancellation
        if (error instanceof Error && !error.message.toLowerCase().includes('user')) {
          toast.error('Failed to connect TON wallet. Please try again.');
        }
      }
    } else {
      // User is on website, redirect to Telegram mini app
      window.open('https://t.me/vanitybox_bot/vanity', '_blank');
    }
  };

  const handleDisconnect = () => {
    if (walletType === 'petra') {
      disconnectPetra();
      setWalletType(null);
    } else if (walletType === 'worldchain') {
      setUser(null);
      setWalletType(null);
      sessionStorage.setItem('skipAutoAuth', '1');
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
    }
    
    // Remove backdrop when disconnecting
    const backdrop = document.getElementById('wallet-dropdown-backdrop');
    if (backdrop) backdrop.remove();
    document.body.style.overflow = '';
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

  // Not connected - show connect button
  if (!user && !petraConnected) {
    return (
      <Button
        onClick={() => {
          // Check for Telegram FIRST (highest priority for mini apps)
          console.log('🔍 Checking environment...');
          console.log('  - window.Telegram:', !!(window as any).Telegram);
          console.log('  - window.Telegram.WebApp:', !!(window as any).Telegram?.WebApp);
          console.log('  - isTelegramWebView():', isTelegramWebView());
          console.log('  - MiniKit.isInstalled():', MiniKit.isInstalled());
          
          if (isTelegramWebView()) {
            console.log('✅ Detected Telegram WebView - connecting TON wallet');
            handleTelegramConnect();
          } else if (MiniKit.isInstalled()) {
            console.log('✅ Detected World App - connecting World ID');
            handleConnect();
          } else {
            console.log('✅ Desktop browser - connecting Petra wallet');
            // Try Petra wallet connection
            connectPetra();
          }
        }}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className={cn("h-10 bg-black text-white border-0 hover:bg-black/90 font-semibold", className)}
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

  // Get display info based on wallet type
  const displayAddress = walletType === 'petra' && petraAccount 
    ? petraAccount.address 
    : user?.walletAddress || '';
  const displayUsername = walletType === 'petra' 
    ? formatAddress(petraAccount?.address || '')
    : user?.username || formatAddress(user?.walletAddress || '');
  const walletIcon = walletType === 'petra' ? petraIcon : wldLogo;

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open) {
        // Refresh balance when dropdown opens for Petra
        if (walletType === 'petra') {
          fetchAptosBalance();
        }
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
          className={cn("h-10 px-4 bg-black text-white border-2 border-black hover:bg-black hover:border-black hover:text-white transition-all duration-300 font-semibold flex items-center gap-2", className)}
        >
          <span className="font-bold text-white truncate max-w-48">
            {displayUsername}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg mt-2 z-[10000]">
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
        
        {/* Show balance for Petra wallet */}
        {walletType === 'petra' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-3 text-sm">
              <div className="text-gray-500 dark:text-gray-400 mb-2">Wallet Balance</div>
              {balanceLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-700 dark:text-white">Loading...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-white font-medium">APT</span>
                    <span className="text-gray-900 dark:text-white font-bold">{formatBalance(aptBalance, 5)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-white font-medium">USDC</span>
                    <span className="text-gray-900 dark:text-white font-bold">{formatBalance(usdcBalance, 5)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
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