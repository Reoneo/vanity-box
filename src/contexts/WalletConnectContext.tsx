import { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, type Config } from 'wagmi';
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

// Singleton state for AppKit - prevents re-initialization
let appKitInstance: any = null;
let wagmiAdapterInstance: any = null;
let initializationPromise: Promise<void> | null = null;

// Singleton query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

// Load AppKit only when needed
async function loadAppKit(projectId: string): Promise<{ adapter: any; appKit: any }> {
  if (appKitInstance && wagmiAdapterInstance) {
    return { adapter: wagmiAdapterInstance, appKit: appKitInstance };
  }

  if (initializationPromise) {
    await initializationPromise;
    return { adapter: wagmiAdapterInstance, appKit: appKitInstance };
  }

  initializationPromise = (async () => {
    console.log('[WalletConnect] Loading AppKit modules...');
    
    const [{ WagmiAdapter }, { createAppKit }, { mainnet, worldchain }] = await Promise.all([
      import('@reown/appkit-adapter-wagmi'),
      import('@reown/appkit/react'),
      import('@reown/appkit/networks'),
    ]);

    wagmiAdapterInstance = new WagmiAdapter({
      networks: [mainnet, worldchain],
      projectId,
      ssr: false,
    });

    appKitInstance = createAppKit({
      adapters: [wagmiAdapterInstance],
      networks: [mainnet, worldchain],
      projectId,
      metadata,
      features: {
        analytics: false, // Disable for performance
      },
      themeMode: 'light',
    });

    console.log('[WalletConnect] AppKit initialized');
  })();

  await initializationPromise;
  return { adapter: wagmiAdapterInstance, appKit: appKitInstance };
}

// Inner component that uses AppKit hooks - only mounted after WagmiProvider is set up
function AppKitHooksConsumer({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ isConnected: boolean; address: string | null }>({
    isConnected: false,
    address: null,
  });
  const [hooks, setHooks] = useState<{
    useAppKit: any;
    useAppKitAccount: any;
    useDisconnect: any;
  } | null>(null);

  // Load hooks dynamically
  useEffect(() => {
    import('@reown/appkit/react').then(({ useAppKit, useAppKitAccount }) => {
      import('wagmi').then(({ useDisconnect }) => {
        setHooks({ useAppKit, useAppKitAccount, useDisconnect });
      });
    });
  }, []);

  // Subscribe to account changes
  useEffect(() => {
    if (!appKitInstance) return;

    const unsubscribe = appKitInstance.subscribeAccount?.((account: any) => {
      const isConnected = !!account?.isConnected;
      const address = account?.address || null;
      
      setState(prev => {
        if (prev.isConnected !== isConnected || prev.address !== address) {
          if (isConnected && address) {
            window.dispatchEvent(new CustomEvent('wallet-connected', {
              detail: { walletType: 'walletconnect', walletAddress: address }
            }));
          }
          return { isConnected, address };
        }
        return prev;
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const openModal = useCallback(async () => {
    console.log('[WalletConnect] Opening modal...');
    if (appKitInstance?.open) {
      await appKitInstance.open();
    }
  }, []);

  const disconnect = useCallback(async () => {
    console.log('[WalletConnect] Disconnecting...');
    if (appKitInstance?.disconnect) {
      await appKitInstance.disconnect();
    }
    setState({ isConnected: false, address: null });
    window.dispatchEvent(new CustomEvent('wallet-disconnected', {}));
  }, []);

  return (
    <WalletContext.Provider value={{
      isConnected: state.isConnected,
      address: state.address,
      openModal,
      disconnect,
      isReady: true,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

// Main provider with deferred loading
export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [wagmiConfig, setWagmiConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Fetch project ID lazily
  useEffect(() => {
    let mounted = true;

    async function fetchConfig() {
      if (!mounted) return;
      try {
        const config = await callEdge<{ projectId: string }>('get-walletconnect-config', {});
        if (mounted && config?.projectId) {
          setProjectId(config.projectId);
          console.log('[WalletConnect] Project ID fetched');
        }
      } catch (err) {
        console.warn('[WalletConnect] Config fetch failed:', err);
        if (mounted) setError('Configuration unavailable');
      }
    }

    // Defer fetch to not block initial render
    const timeoutId = setTimeout(() => fetchConfig(), 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Initialize AppKit when user opens modal (deferred)
  const initializeAppKit = useCallback(async () => {
    if (!projectId || wagmiConfig || initRef.current) return false;
    initRef.current = true;
    
    try {
      const { adapter } = await loadAppKit(projectId);
      setWagmiConfig(adapter.wagmiConfig as Config);
      return true;
    } catch (err) {
      console.error('[WalletConnect] Init failed:', err);
      setError('Failed to initialize');
      initRef.current = false;
      return false;
    }
  }, [projectId, wagmiConfig]);

  // Deferred open modal - initializes on first click
  const openModalDeferred = useCallback(async () => {
    if (!wagmiConfig && projectId) {
      const success = await initializeAppKit();
      if (success) {
        // Wait for next frame to ensure React has re-rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            appKitInstance?.open?.();
          }, 50);
        });
      }
    } else if (appKitInstance?.open) {
      appKitInstance.open();
    }
  }, [wagmiConfig, projectId, initializeAppKit]);

  // If AppKit is fully loaded, use the complete provider stack
  if (wagmiConfig) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AppKitHooksConsumer>
            {children}
          </AppKitHooksConsumer>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  // Before AppKit is loaded - lightweight wrapper with deferred functionality
  return (
    <WalletContext.Provider value={{
      isConnected: false,
      address: null,
      openModal: openModalDeferred,
      disconnect: () => {},
      isReady: !!projectId && !error,
    }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WalletContext.Provider>
  );
}
