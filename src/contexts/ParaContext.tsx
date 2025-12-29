import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { ParaProvider as ParaSDKProvider, useModal, type TExternalWallet } from "@getpara/react-sdk";
import { mainnet, polygon, arbitrum, optimism, base } from "wagmi/chains";
import "@getpara/react-sdk/styles.css";
import { callEdge } from '@/lib/supaInvoke';

interface ParaWalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

interface ParaContextType {
  wallet: ParaWalletState;
  setWallet: (wallet: ParaWalletState) => void;
  disconnect: () => void;
  openParaModal: () => void;
  closeParaModal: () => void;
  isModalOpen: boolean;
  isConfigured: boolean;
  isLoading: boolean;
}

const ParaContext = createContext<ParaContextType | undefined>(undefined);

export const useParaWallet = () => {
  const context = useContext(ParaContext);
  if (!context) {
    throw new Error('useParaWallet must be used within a ParaWalletProvider');
  }
  return context;
};

// Internal component that uses Para hooks (must be inside ParaSDKProvider)
const ParaWalletStateManager: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isOpen, openModal, closeModal } = useModal();
  const [wallet, setWallet] = useState<ParaWalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      isConnected: false,
      chainId: null,
    });
    localStorage.removeItem('para_wallet_session');
  }, []);

  const handleOpenModal = useCallback(() => {
    openModal();
  }, [openModal]);

  return (
    <ParaContext.Provider value={{ 
      wallet, 
      setWallet, 
      disconnect, 
      openParaModal: handleOpenModal,
      closeParaModal: closeModal,
      isModalOpen: isOpen,
      isConfigured: true,
      isLoading: false
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

// World Chain definition
const worldChain = {
  id: 480,
  name: 'World Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
    public: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
  },
  blockExplorers: {
    default: { name: 'World Chain Explorer', url: 'https://worldchain-mainnet.explorer.alchemy.com' },
  },
} as const;

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

  // Loading state
  if (isLoading) {
    return (
      <ParaContext.Provider value={{
        wallet: { address: null, isConnected: false, chainId: null },
        setWallet: () => {},
        disconnect: () => {},
        openParaModal: () => console.log('Para loading...'),
        closeParaModal: () => {},
        isModalOpen: false,
        isConfigured: false,
        isLoading: true
      }}>
        {children}
      </ParaContext.Provider>
    );
  }

  // Error or no config state
  if (error || !config) {
    console.warn('Para not configured:', error);
    return (
      <ParaContext.Provider value={{
        wallet: { address: null, isConnected: false, chainId: null },
        setWallet: () => {},
        disconnect: () => {},
        openParaModal: () => console.warn('Para API key not configured'),
        closeParaModal: () => {},
        isModalOpen: false,
        isConfigured: false,
        isLoading: false
      }}>
        {children}
      </ParaContext.Provider>
    );
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
        wallets: [
          "METAMASK" as TExternalWallet,
          "RAINBOW" as TExternalWallet,
          "WALLET_CONNECT" as TExternalWallet,
          "COINBASE" as TExternalWallet,
          "PHANTOM" as TExternalWallet,
        ],
        walletConnect: config.walletConnectProjectId ? { projectId: config.walletConnectProjectId } : undefined,
        evmConnector: {
          config: {
            chains: [mainnet, polygon, arbitrum, optimism, base, worldChain],
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
