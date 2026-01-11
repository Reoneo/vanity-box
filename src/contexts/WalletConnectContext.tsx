import '@rainbow-me/rainbowkit/styles.css';
import { 
  getDefaultConfig, 
  RainbowKitProvider,
  lightTheme,
  useConnectModal,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useDisconnect } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, ReactNode, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { http, type Chain } from 'viem';
import { callEdge } from '@/lib/supaInvoke';

// Define World Chain (chain ID 480)
const worldchain: Chain = {
  id: 480,
  name: 'World Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
  },
  blockExplorers: {
    default: { name: 'Worldscan', url: 'https://worldscan.org' },
  },
};

// Singleton query client - prevents recreation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Context for wallet state
interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  openModal: () => void;
  disconnect: () => void;
  isReady: boolean;
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  address: null,
  openModal: () => {},
  disconnect: () => {},
  isReady: false,
});

export const useWalletConnect = () => useContext(WalletContext);

// Store modal opener function reference
let openConnectModalFn: (() => void) | null = null;

// Inner component that uses wagmi hooks
function WalletContextInner({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const prevConnectedRef = useRef(false);

  // Edge-triggered: only dispatch on transition from disconnected -> connected
  useEffect(() => {
    const wasConnected = prevConnectedRef.current;
    prevConnectedRef.current = isConnected;
    
    // Only fire event on transition, not on every render
    if (isConnected && address && !wasConnected) {
      window.dispatchEvent(new CustomEvent('wallet-connected', {
        detail: { walletType: 'walletconnect', walletAddress: address }
      }));
    }
  }, [isConnected, address]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    window.dispatchEvent(new CustomEvent('wallet-disconnected', {}));
  }, [wagmiDisconnect]);

  const openModal = useCallback(() => {
    if (openConnectModalFn) {
      openConnectModalFn();
    }
  }, []);

  const contextValue = useMemo(() => ({
    isConnected,
    address: address || null,
    openModal,
    disconnect,
    isReady: true,
  }), [isConnected, address, openModal, disconnect]);

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Component to capture modal opener - uses ES6 imported hook
function ModalOpenerInner() {
  const { openConnectModal } = useConnectModal();
  
  useEffect(() => {
    openConnectModalFn = openConnectModal || null;
    return () => {
      openConnectModalFn = null;
    };
  }, [openConnectModal]);
  
  return null;
}

// Main provider
export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ReturnType<typeof getDefaultConfig> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch project ID and create config
  useEffect(() => {
    let mounted = true;
    
    const initConfig = async () => {
      try {
        const data = await callEdge<{ projectId: string }>('get-walletconnect-config', {});
        
        if (!mounted || !data?.projectId) {
          console.warn('[RainbowKit] No project ID available');
          setIsLoading(false);
          return;
        }

        const wagmiConfig = getDefaultConfig({
          appName: 'Vanity.box',
          projectId: data.projectId,
          chains: [mainnet, worldchain],
          transports: {
            [mainnet.id]: http(),
            [worldchain.id]: http('https://worldchain-mainnet.g.alchemy.com/public'),
          },
        });
        
        if (mounted) {
          setConfig(wagmiConfig);
          setIsLoading(false);
          console.log('[RainbowKit] Config initialized');
        }
      } catch (err) {
        console.warn('[RainbowKit] Config fetch failed:', err);
        if (mounted) setIsLoading(false);
      }
    };

    // Defer initialization slightly to not block initial render
    const timer = setTimeout(initConfig, 50);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Lightweight placeholder while loading
  if (!config) {
    return (
      <WalletContext.Provider value={{
        isConnected: false,
        address: null,
        openModal: () => {
          if (!isLoading) {
            console.log('[RainbowKit] Config not available');
          }
        },
        disconnect: () => {},
        isReady: false,
      }}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WalletContext.Provider>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#000000',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
          modalSize="compact"
          showRecentTransactions={false}
        >
          <ModalOpenerInner />
          <WalletContextInner>
            {children}
          </WalletContextInner>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
