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
import { LogOut, ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import wldLogo from '@/assets/wld-logo.png';
import petraIcon from '@/assets/petra-icon.png';
import iotaLogo from '@/assets/vanity-iota-avatar.png';
import { isTelegramWebView } from '@/lib/telegram';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { usePetraWallet } from '@/hooks/use-petra-wallet';
import { toast } from 'sonner';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { ConnectModal } from '@iota/dapp-kit';
import { useIotaAccountSafe, useIotaDisconnectSafe } from '@/hooks/use-iota-wallet-safe';

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
  const { account: petraAccount, network: petraNetwork, isConnected: petraConnected, disconnect: disconnectPetra } = usePetraWallet();
  
  // Use our context wrapper for RainbowKit - handles loading state safely
  const { 
    isConnected: walletConnectConnected, 
    address: walletConnectAddress, 
    chainId: walletConnectChainId,
    openModal: openConnectModal,
    openChainModal,
    disconnect: wagmiDisconnect,
    isReady: walletConnectReady
  } = useWalletConnect();
  
  const [walletType, setWalletType] = useState<'worldchain' | 'petra' | 'walletconnect' | 'iota' | null>(null);
  const [aptBalance, setAptBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState<string>('mainnet');
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensLoading, setEnsLoading] = useState(false);
  const [showIotaModal, setShowIotaModal] = useState(false);

  // Check if we're on desktop browser (not mobile phone or special app)
  // Include iPad/tablets as desktop since they can use browser extensions
  const isMobilePhone = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isInSpecialApp = !!(window as any).Telegram?.WebApp || 
    typeof (window as any).WorldApp !== 'undefined' || 
    MiniKit.isInstalled();
  const isDesktopBrowser = typeof window !== 'undefined' && !isMobilePhone && !isInSpecialApp;

  // IOTA wallet state (desktop only) - uses safe hooks that return null on mobile
  // isIotaAvailable is computed at module level, so it's stable across renders
  const iotaAccount = useIotaAccountSafe();
  const iotaDisconnectResult = useIotaDisconnectSafe();
  const disconnectIota = iotaDisconnectResult.mutate;
  const iotaConnected = !!iotaAccount?.address;

  // Helper to format balance with proper decimals
  const formatBalance = (value: number, decimals = 6): string => {
    if (!isFinite(value) || value <= 0) return "0";
    const threshold = Math.pow(10, -decimals);
    if (value < threshold) return `<${threshold.toFixed(decimals)}`;
    return value.toFixed(decimals);
  };

  // Handle WalletConnect connection
  useEffect(() => {
    if (walletConnectConnected && walletConnectAddress) {
      console.log('[WalletConnection] WalletConnect connected:', walletConnectAddress);
      setWalletType('walletconnect');
      
      // Fetch ENS name first, then set user and dispatch event
      const initWalletConnect = async () => {
        const resolvedEns = await fetchEnsNameAsync(walletConnectAddress);
        const displayName = resolvedEns || formatAddress(walletConnectAddress);
        
        setUser({
          walletAddress: walletConnectAddress,
          username: displayName
        });
        setIsLoading(false);
        
        // Dispatch wallet-connected event with the resolved ENS name
        window.dispatchEvent(new CustomEvent('wallet-connected', { 
          detail: { 
            walletAddress: walletConnectAddress, 
            username: resolvedEns, // Send the ENS name, not formatted address
            walletType: 'walletconnect' 
          } 
        }));
        console.log('[WalletConnection] Dispatched wallet-connected event with ENS:', resolvedEns);
      };
      
      initWalletConnect();
    }
  }, [walletConnectConnected, walletConnectAddress]);

  useEffect(() => {
    // Check Petra wallet connection and network changes
    if (petraConnected && petraAccount) {
      setWalletType('petra');
      const networkName = petraNetwork?.name?.toLowerCase() || 'mainnet';
      setActiveNetwork(networkName);
      window.dispatchEvent(new CustomEvent('wallet-connected', { 
        detail: { walletType: 'petra' } 
      }));
      fetchAptosBalance();
      if (petraAccount.address) {
        fetchEnsName(petraAccount.address);
      }
    }
  }, [petraConnected, petraAccount, petraNetwork]);

  // Handle IOTA wallet connection (web only)
  useEffect(() => {
    if (iotaConnected && iotaAccount?.address) {
      console.log('[WalletConnection] IOTA wallet connected:', iotaAccount.address);
      setWalletType('iota');
      setIsLoading(true);
      
      // Resolve IOTA address to .iota name
      const resolveIotaName = async () => {
        try {
          const data = await callEdge<any>("resolve-iota-address", {
            address: iotaAccount.address,
          });

          const iotaName = typeof data?.name === 'string' ? data.name : null; // e.g., "vanity.iota"
          console.log('[WalletConnection] Resolved IOTA name:', iotaName);

          setUser({
            walletAddress: iotaAccount.address,
            username: iotaName || formatAddress(iotaAccount.address),
          });

          window.dispatchEvent(
            new CustomEvent('wallet-connected', {
              detail: {
                walletAddress: iotaAccount.address,
                walletType: 'iota',
                username: iotaName, // used by Profile dock button
              },
            })
          );
        } catch (error) {
          console.error('[WalletConnection] Failed to resolve IOTA name:', error);
          setUser({
            walletAddress: iotaAccount.address,
            username: formatAddress(iotaAccount.address)
          });
          
          window.dispatchEvent(new CustomEvent('wallet-connected', { 
            detail: { 
              walletAddress: iotaAccount.address, 
              walletType: 'iota',
              username: null
            } 
          }));
        } finally {
          setIsLoading(false);
        }
      };
      
      resolveIotaName();
    }
  }, [iotaConnected, iotaAccount?.address]);

  useEffect(() => {
    console.log('🌍 Environment check on mount:');
    console.log('  - Telegram WebView:', isTelegramWebView());
    console.log('  - World App:', MiniKit.isInstalled());
    console.log('  - User Agent:', navigator.userAgent.substring(0, 150));

    const handleTriggerConnect = () => {
      if (!user && !petraConnected && !walletConnectConnected && !iotaConnected) {
        if (isTelegramWebView()) {
          console.log('🔄 Trigger: Connecting via Telegram');
          handleTelegramConnect();
        } else if (MiniKit.isInstalled()) {
          console.log('🔄 Trigger: Connecting via World App');
          handleConnect();
        } else {
          // Both desktop and mobile browser -> show IOTA modal
          // On mobile, the modal will show "Desktop Required" message
          console.log('🔄 Trigger: Opening IOTA wallet modal');
          setShowIotaModal(true);
        }
      }
    };

    window.addEventListener('trigger-wallet-connect', handleTriggerConnect);
    return () => {
      window.removeEventListener('trigger-wallet-connect', handleTriggerConnect);
    };
  }, [user, petraConnected, walletConnectConnected, iotaConnected]);

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

  // Fetch ENS name for connected wallet (async version that returns the result)
  const fetchEnsNameAsync = async (address: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
      if (response.ok) {
        const data = await response.json();
        if (data.name) {
          setEnsName(data.name);
          return data.name;
        }
      }
      
      if (walletType === 'worldchain') {
        const worldEns = await getWorldChainENS(address);
        if (worldEns) {
          setEnsName(worldEns);
          return worldEns;
        }
      }
      
      setEnsName(null);
      return null;
    } catch (error) {
      console.error('Failed to fetch ENS:', error);
      setEnsName(null);
      return null;
    }
  };

  // Fetch ENS name for connected wallet (sets loading state)
  const fetchEnsName = async (address: string) => {
    setEnsLoading(true);
    try {
      await fetchEnsNameAsync(address);
    } finally {
      setEnsLoading(false);
    }
  };

  // Handle WalletConnect modal open - uses context wrapper
  const handleWalletConnectOpen = () => {
    console.log('[WalletConnection] Opening RainbowKit modal...');
    if (walletConnectReady && openConnectModal) {
      openConnectModal();
    } else {
      console.warn('[WalletConnection] Connect modal not ready yet');
      toast.error('Wallet connection is initializing. Please try again.');
    }
  };

  const handleConnect = async () => {
    if (petraConnected) return;

    if (!MiniKit.isInstalled()) {
      console.log('Not in World App - redirecting to World App ecosystem page');
      window.open('https://world.org/ecosystem/app_ed7e61cb0c52630464178eed59e3fbdd', '_blank');
      return;
    }

    setIsLoading(true);
    try {
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
        
        fetchEnsName(finalPayload.address);
        
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
    if (isTelegramWebView()) {
      try {
        setIsLoading(true);
        console.log('🔄 Connecting TON wallet in Telegram mini app...');
        
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

        await tonConnectUI.connectWallet();
        
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
        
        if (error instanceof Error && !error.message.toLowerCase().includes('user')) {
          toast.error('Failed to connect TON wallet. Please try again.');
        }
      }
    } else {
      window.open('https://t.me/vanitybox_bot/vanity', '_blank');
    }
  };

  const handleDisconnect = () => {
    if (walletType === 'petra') {
      disconnectPetra();
      setWalletType(null);
      setEnsName(null);
    } else if (walletType === 'walletconnect') {
      wagmiDisconnect();
      setUser(null);
      setWalletType(null);
      setEnsName(null);
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
    } else if (walletType === 'iota') {
      disconnectIota();
      setUser(null);
      setWalletType(null);
      setEnsName(null);
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
    } else if (walletType === 'worldchain') {
      setUser(null);
      setWalletType(null);
      setEnsName(null);
      sessionStorage.setItem('skipAutoAuth', '1');
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
    }
    
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
    
    const cacheKey = `worldid_domain_${address.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ Using cached domain:', cached);
      return cached;
    }

    try {
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

    try {
      console.log('🌐 Fetching from World Bridge API...');
      const worldBridgeResp = await fetch(`https://usernames.worldcoin.org/v1/addresses/${address.toLowerCase()}`);
      if (worldBridgeResp.ok) {
        const data = await worldBridgeResp.json();
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
  if (!user && !petraConnected && !walletConnectConnected && !iotaConnected) {
    return (
      <>
        <Button
          onClick={() => {
            console.log('🔍 Checking environment...');
            console.log('  - window.Telegram:', !!(window as any).Telegram);
            console.log('  - window.Telegram.WebApp:', !!(window as any).Telegram?.WebApp);
            console.log('  - isTelegramWebView():', isTelegramWebView());
            console.log('  - MiniKit.isInstalled():', MiniKit.isInstalled());
            console.log('  - isDesktopBrowser:', isDesktopBrowser);
            
            if (isTelegramWebView()) {
              console.log('✅ Detected Telegram WebView - connecting TON wallet');
              handleTelegramConnect();
            } else if (MiniKit.isInstalled()) {
              console.log('✅ Detected World App - connecting World ID');
              handleConnect();
            } else {
              // Both desktop and mobile browser -> show IOTA modal
              // On mobile, the IOTA modal in IotaSubdomainMintModal shows "Desktop Required" message
              console.log('✅ Opening IOTA wallet modal');
              setShowIotaModal(true);
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
        
        {/* IOTA Connect Modal - only render on desktop where IOTA provider exists */}
        {isDesktopBrowser && (
          <ConnectModal 
            trigger={<span style={{ display: 'none' }} />}
            open={showIotaModal} 
            onOpenChange={(open) => {
              setShowIotaModal(open);
            }}
            onConnected={({ wallet }) => {
              console.log('[WalletConnection] IOTA wallet connected via modal:', wallet.name);
              setShowIotaModal(false);
            }}
          />
        )}
      </>
    );
  }

  // Get display info based on wallet type
  const displayAddress = walletType === 'petra' && petraAccount 
    ? petraAccount.address 
    : walletType === 'walletconnect' && walletConnectAddress
    ? walletConnectAddress
    : walletType === 'iota' && iotaAccount?.address
    ? iotaAccount.address
    : user?.walletAddress || '';
  const displayUsername = walletType === 'petra' 
    ? formatAddress(petraAccount?.address || '')
    : walletType === 'walletconnect' && walletConnectAddress
    ? ensName || formatAddress(walletConnectAddress)
    : walletType === 'iota' && iotaAccount?.address
    ? formatAddress(iotaAccount.address)
    : user?.username || formatAddress(user?.walletAddress || '');
  const walletIcon = walletType === 'petra' ? petraIcon : walletType === 'iota' ? iotaLogo : wldLogo;

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open) {
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
        <div className="p-2">
          <Button
            variant="destructive"
            className="w-full justify-center gap-2 h-9"
            onClick={handleDisconnect}
          >
            <LogOut className="h-4 w-4" />
            {t('disconnect')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
