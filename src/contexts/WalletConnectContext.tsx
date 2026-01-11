import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { createAppKit, useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { WagmiProvider, type Config } from 'wagmi';
import { mainnet, worldchain } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { callEdge } from '@/lib/supaInvoke';

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

// Metadata for the app
const metadata = {
  name: 'Vanity.box',
  description: 'Web3 Identity & ENS Subdomain Platform',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://vanity.box',
  icons: ['https://vanity.box/vanity-box-logo.png']
};

const networks = [mainnet, worldchain] as const;
const queryClient = new QueryClient();

// Inner component that uses AppKit hooks
function WalletContextInner({ children }: { children: ReactNode }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect: appKitDisconnect } = useDisconnect();
  
  const openModal = () => {
    console.log('[WalletConnect] Opening modal...');
    open();
  };
  
  const disconnect = () => {
    console.log('[WalletConnect] Disconnecting...');
    appKitDisconnect();
  };
  
  useEffect(() => {
    if (isConnected && address) {
      console.log('[WalletConnect] Connected:', address);
      window.dispatchEvent(new CustomEvent('wallet-connected', { 
        detail: { walletType: 'walletconnect', walletAddress: address } 
      }));
    }
  }, [isConnected, address]);
  
  return (
    <WalletContext.Provider value={{
      isConnected,
      address: address || null,
      openModal,
      disconnect,
      isReady: true,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

// Main provider that fetches config and initializes AppKit
export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const [wagmiAdapter, setWagmiAdapter] = useState<WagmiAdapter | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAppKit = async () => {
      try {
        // Fetch WalletConnect project ID from Supabase
        const config = await callEdge<{ projectId: string }>('get-walletconnect-config', {});
        
        if (!mounted) return;
        
        if (!config?.projectId) {
          console.error('[WalletConnect] No project ID found');
          setError('WalletConnect project ID not configured');
          return;
        }

        console.log('[WalletConnect] Initializing with project ID:', config.projectId.substring(0, 10) + '...');

        // Create wagmi adapter
        const adapter = new WagmiAdapter({
          networks: [mainnet, worldchain],
          projectId: config.projectId,
          ssr: false,
        });

        // Initialize AppKit
        createAppKit({
          adapters: [adapter],
          networks: [mainnet, worldchain],
          projectId: config.projectId,
          metadata,
          features: {
            analytics: true,
          },
          themeMode: 'light',
        });

        if (mounted) {
          setWagmiAdapter(adapter);
          setIsInitialized(true);
          console.log('[WalletConnect] Initialized successfully');
        }
      } catch (err) {
        console.error('[WalletConnect] Initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize WalletConnect');
        }
      }
    };

    initAppKit();

    return () => {
      mounted = false;
    };
  }, []);

  // Show loading state or error
  if (error) {
    console.warn('[WalletConnect] Error state:', error);
    // Still render children but without wallet functionality
    return (
      <WalletContext.Provider value={{
        isConnected: false,
        address: null,
        openModal: () => console.warn('WalletConnect not available:', error),
        disconnect: () => {},
        isReady: false,
      }}>
        {children}
      </WalletContext.Provider>
    );
  }

  if (!isInitialized || !wagmiAdapter) {
    // Still render children while loading
    return (
      <WalletContext.Provider value={{
        isConnected: false,
        address: null,
        openModal: () => console.log('WalletConnect initializing...'),
        disconnect: () => {},
        isReady: false,
      }}>
        {children}
      </WalletContext.Provider>
    );
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        <WalletContextInner>
          {children}
        </WalletContextInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
