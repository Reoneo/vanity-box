import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { ParaProvider as ParaSDKProvider, useModal, useAccount, useWalletState, useLogout, type TExternalWallet } from "@getpara/react-sdk";
import { mainnet, polygon, arbitrum, optimism, base, type Chain } from "wagmi/chains";
import "@getpara/react-sdk/styles.css";
import { callEdge } from '@/lib/supaInvoke';
import { toast } from 'sonner';

interface ParaWalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

interface ParaContextType {
  wallet: ParaWalletState;
  setWallet: (wallet: ParaWalletState) => void;
  disconnect: () => Promise<void>;
  openParaModal: () => void;
  closeParaModal: () => void;
  isModalOpen: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  switchNetwork: (chainId: number) => Promise<void>;
}

const ParaContext = createContext<ParaContextType | undefined>(undefined);

export const useParaWallet = () => {
  const context = useContext(ParaContext);
  if (!context) {
    throw new Error('useParaWallet must be used within a ParaWalletProvider');
  }
  return context;
};

// World Chain definition as proper wagmi chain
const worldChain: Chain = {
  id: 480,
  name: 'World Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
  },
  blockExplorers: {
    default: { name: 'World Chain Explorer', url: 'https://worldchain-mainnet.explorer.alchemy.com' },
  },
};

// Supported chains configuration
const SUPPORTED_CHAINS = [
  { id: 480, name: 'World Chain', rpc: 'https://worldchain-mainnet.g.alchemy.com/public' },
  { id: 1, name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
  { id: 8453, name: 'Base', rpc: 'https://mainnet.base.org' },
  { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com' },
  { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
  { id: 10, name: 'Optimism', rpc: 'https://mainnet.optimism.io' },
];

// Detect if on mobile device
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Detect if running in Brave browser
const isBraveBrowser = (): boolean => {
  return !!(navigator as any).brave;
};

// Internal component that uses Para hooks (must be inside ParaSDKProvider)
const ParaWalletStateManager: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isOpen, openModal, closeModal } = useModal();
  const account = useAccount();
  const { selectedWallet } = useWalletState();
  const { logoutAsync, isPending: isLogoutPending } = useLogout();
  
  const [wallet, setWalletState] = useState<ParaWalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });

  // Sync Para SDK state to our wallet state
  useEffect(() => {
    const evmAccount = account?.external?.evm;
    const isEvmConnected = evmAccount?.isConnected && evmAccount?.address;
    
    if (isEvmConnected && evmAccount?.address) {
      const newAddress = evmAccount.address as string;
      const newChainId = evmAccount.chainId ?? null;
      
      // Only update if changed
      if (!wallet.isConnected || wallet.address !== newAddress || wallet.chainId !== newChainId) {
        console.log('🔗 Para EVM wallet connected:', newAddress, 'on chain:', newChainId);
        setWalletState({
          address: newAddress,
          isConnected: true,
          chainId: typeof newChainId === 'number' ? newChainId : null,
        });
        
        // Dispatch wallet-connected event for other components
        window.dispatchEvent(new CustomEvent('wallet-connected', { 
          detail: { walletType: 'para', walletAddress: newAddress, chainId: newChainId } 
        }));
      }
    } else if (wallet.isConnected && !isEvmConnected) {
      // Disconnected
      console.log('🔌 Para wallet disconnected');
      setWalletState({
        address: null,
        isConnected: false,
        chainId: null,
      });
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
    }
  }, [account?.external?.evm?.isConnected, account?.external?.evm?.address, account?.external?.evm?.chainId, wallet.isConnected, wallet.address, wallet.chainId]);

  const setWallet = useCallback((newWallet: ParaWalletState) => {
    setWalletState(newWallet);
  }, []);

  // Use Para SDK's logout hook for proper disconnect
  const disconnect = useCallback(async () => {
    try {
      console.log('🔌 Disconnecting Para wallet via SDK...');
      await logoutAsync();
      setWalletState({
        address: null,
        isConnected: false,
        chainId: null,
      });
      localStorage.removeItem('para_wallet_session');
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
      console.log('✅ Para wallet disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect Para wallet:', error);
      // Still clear local state even if SDK logout fails
      setWalletState({
        address: null,
        isConnected: false,
        chainId: null,
      });
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
    }
  }, [logoutAsync]);

  const handleOpenModal = useCallback(() => {
    openModal();
  }, [openModal]);

  // Network switching function
  const switchNetwork = useCallback(async (chainId: number) => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    // Get the provider from window.ethereum (injected by external wallet)
    const provider = (window as any).ethereum;
    if (!provider) {
      throw new Error('No wallet provider found');
    }

    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
      // Try to switch to the chain
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      // Update local state
      setWalletState(prev => ({ ...prev, chainId }));
      console.log(`✅ Switched to ${chain.name}`);
    } catch (switchError: any) {
      // If chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: chain.name,
              rpcUrls: [chain.rpc],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            }],
          });
          setWalletState(prev => ({ ...prev, chainId }));
        } catch (addError) {
          console.error('Failed to add chain:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }, []);

  return (
    <ParaContext.Provider value={{ 
      wallet, 
      setWallet, 
      disconnect, 
      openParaModal: handleOpenModal,
      closeParaModal: closeModal,
      isModalOpen: isOpen,
      isConfigured: true,
      isLoading: false,
      switchNetwork,
    }}>
      {children}
    </ParaContext.Provider>
  );
};

interface ParaWalletProviderProps {
  children: ReactNode;
}

interface ParaConfig {
  apiKey: string;
  walletConnectProjectId: string;
}

export const ParaWalletProvider: React.FC<ParaWalletProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<ParaConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log('Fetching Para config from edge function...');
        const result = await callEdge<ParaConfig>('get-para-config', {});
        if (result && result.apiKey) {
          console.log('✅ Para config loaded successfully');
          setConfig(result);
        } else {
          console.warn('Para config returned empty or invalid');
          setError('Para configuration not available');
        }
      } catch (err) {
        console.error('Failed to fetch Para config:', err);
        setError('Failed to load Para configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Placeholder context for loading/error states
  const placeholderContext: ParaContextType = {
    wallet: { address: null, isConnected: false, chainId: null },
    setWallet: () => {},
    disconnect: async () => {},
    openParaModal: () => console.log(isLoading ? 'Para loading...' : 'Para not configured'),
    closeParaModal: () => {},
    isModalOpen: false,
    isConfigured: false,
    isLoading,
    switchNetwork: async () => {},
  };

  // Loading state
  if (isLoading) {
    return (
      <ParaContext.Provider value={placeholderContext}>
        {children}
      </ParaContext.Provider>
    );
  }

  // Error or no config state
  if (error || !config) {
    console.warn('Para not configured:', error);
    return (
      <ParaContext.Provider value={placeholderContext}>
        {children}
      </ParaContext.Provider>
    );
  }

  // Determine wallet list based on environment and WalletConnect availability
  const getWalletList = (): TExternalWallet[] => {
    const wallets: TExternalWallet[] = [];
    
    // Only add WalletConnect if we have a valid projectId
    if (config.walletConnectProjectId && config.walletConnectProjectId.length >= 32) {
      wallets.push("WALLETCONNECT" as TExternalWallet);
    } else {
      console.warn('WalletConnect projectId missing or invalid - WalletConnect option hidden');
    }
    
    // Add other wallets
    wallets.push(
      "COINBASE" as TExternalWallet,
      "METAMASK" as TExternalWallet,
      "RAINBOW" as TExternalWallet,
    );
    
    return wallets;
  };

  // Build WalletConnect config only if projectId is valid
  const walletConnectConfig = config.walletConnectProjectId && config.walletConnectProjectId.length >= 32
    ? { projectId: config.walletConnectProjectId }
    : undefined;

  if (!walletConnectConfig) {
    console.warn('⚠️ WalletConnect disabled - missing or invalid projectId');
  }

  return (
    <ParaSDKProvider
      paraClientConfig={{
        apiKey: config.apiKey,
        env: "BETA" as any,
      }}
      config={{
        appName: 'Vanity.box',
      }}
      externalWalletConfig={{
        wallets: getWalletList(),
        walletConnect: walletConnectConfig,
        evmConnector: {
          config: {
            chains: [worldChain, mainnet, base, polygon, arbitrum, optimism],
          },
        },
      }}
      paraModalConfig={{
        logo: "/vanity-box-logo.png",
        theme: {
          borderRadius: "xl",
          font: "Rubik"
        },
        oAuthMethods: [],
        disableEmailLogin: true,
        disablePhoneLogin: true,
        authLayout: ["EXTERNAL:FULL" as any],
        recoverySecretStepEnabled: false,
        onRampTestMode: false,
      }}
    >
      <ParaWalletStateManager>
        {children}
      </ParaWalletStateManager>
    </ParaSDKProvider>
  );
};

export default ParaWalletProvider;
