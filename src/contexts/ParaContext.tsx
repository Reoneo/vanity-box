import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ParaProvider, useModal, useWalletState, type TExternalWallet } from '@getpara/react-sdk';
import "@getpara/react-sdk/styles.css";
import { toast } from "sonner";

// Types for Para wallet state
interface ParaWalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  networkName: string | null;
}

interface ParaContextType {
  wallet: ParaWalletState;
  disconnect: () => Promise<void>;
  openParaModal: () => void;
  closeParaModal: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  isModalOpen: boolean;
}

const ParaContext = createContext<ParaContextType | undefined>(undefined);

export const useParaWallet = () => {
  const context = useContext(ParaContext);
  if (!context) {
    throw new Error('useParaWallet must be used within a ParaWalletProvider');
  }
  return context;
};

// Memoized wallet list - defined outside component
const WALLET_LIST: TExternalWallet[] = [
  "METAMASK", "RAINBOW", "WALLETCONNECT", "COINBASE", "PHANTOM",
  "ZERION", "SAFE", "RABBY", "OKX", "HAHA", "BACKPACK",
  "VALORA", "GLOW", "SOLFLARE", "KEPLR", "LEAP", "COSMOSTATION"
];

const getNetworkName = (chainId: number | null): string | null => {
  if (!chainId) return null;
  const networks: Record<number, string> = {
    1: 'Ethereum', 10: 'Optimism', 137: 'Polygon', 42161: 'Arbitrum',
    8453: 'Base', 480: 'World Chain', 56: 'BNB Chain', 43114: 'Avalanche',
  };
  return networks[chainId] || `Chain ${chainId}`;
};

const formatAddress = (address: string): string => `${address.slice(0, 6)}...${address.slice(-4)}`;

function ParaWalletStateManager({ children }: { children: React.ReactNode }) {
  const { selectedWallet } = useWalletState();
  const { openModal, closeModal, isOpen } = useModal();
  
  const [wallet, setWallet] = useState<ParaWalletState>({
    isConnected: false, address: null, chainId: null, networkName: null,
  });

  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const previousConnectedRef = useRef<boolean>(false);

  // Sync wallet state with debouncing
  useEffect(() => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);

    updateTimeoutRef.current = setTimeout(() => {
      const isConnected = !!selectedWallet.address;
      const newAddress = selectedWallet.address || null;

      if (isConnected && !previousConnectedRef.current && newAddress) {
        toast.success('Wallet connected!', { description: `Connected to ${formatAddress(newAddress)}` });
      } else if (!isConnected && previousConnectedRef.current) {
        toast.info('Wallet disconnected');
      }

      previousConnectedRef.current = isConnected;
      setWallet({ isConnected, address: newAddress, chainId: null, networkName: null });
    }, 50);

    return () => { if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); };
  }, [selectedWallet.address, selectedWallet.id]);

  // Clear session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        Object.keys(localStorage).filter(key => 
          key.toLowerCase().includes('para') || key.includes('wc@') || key.includes('walletconnect')
        ).forEach(key => localStorage.removeItem(key));
      } catch (e) { /* silent */ }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const disconnect = useCallback(async () => {
    try {
      Object.keys(localStorage).filter(key => 
        key.toLowerCase().includes('para') || key.includes('wc@') || key.includes('walletconnect')
      ).forEach(key => localStorage.removeItem(key));
      setWallet({ isConnected: false, address: null, chainId: null, networkName: null });
      window.location.reload();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, []);

  const switchNetwork = useCallback(async (targetChainId: number) => {
    try {
      if (typeof (window as any).ethereum !== 'undefined') {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
        toast.success(`Switched to ${getNetworkName(targetChainId)}`);
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
      toast.error('Failed to switch network');
    }
  }, []);

  const contextValue = useMemo(() => ({
    wallet, disconnect,
    openParaModal: () => openModal({}),
    closeParaModal: closeModal,
    switchNetwork, isModalOpen: isOpen,
  }), [wallet, disconnect, openModal, closeModal, switchNetwork, isOpen]);

  return <ParaContext.Provider value={contextValue}>{children}</ParaContext.Provider>;
}

interface ParaConfig { apiKey: string; walletConnectProjectId: string; }

export function ParaWalletProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ParaConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-para-config`,
          { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
        );
        if (!response.ok) throw new Error('Failed to fetch Para config');
        const data = await response.json();
        setConfig({
          apiKey: data.apiKey,
          walletConnectProjectId: data.walletConnectProjectId || 'd459410c0dd3fe923af1a83c963a66b3',
        });
        console.log('✅ Para config loaded successfully');
      } catch (err) {
        console.error('Failed to load Para config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  if (loading || !config) return <>{children}</>;

  return (
    <ParaProvider
      paraClientConfig={{ apiKey: config.apiKey, env: "BETA" as any }}
      config={{ appName: "Vanity", disableAutoSessionKeepAlive: true }}
      externalWalletConfig={{
        wallets: WALLET_LIST,
        walletConnect: { projectId: config.walletConnectProjectId },
      }}
      paraModalConfig={{
        logo: "https://vanity.box/vanity-box-logo.png",
        theme: { font: "Inter", borderRadius: "xl", foregroundColor: "#FFFFFF", backgroundColor: "#0F0F0F", accentColor: "#8B5CF6" },
        oAuthMethods: ["GOOGLE", "APPLE"],
        disableEmailLogin: true,
        disablePhoneLogin: true,
        authLayout: ["EXTERNAL:FULL", "AUTH:FULL"],
        recoverySecretStepEnabled: true,
        onRampTestMode: true,
      }}
    >
      <ParaWalletStateManager>{children}</ParaWalletStateManager>
    </ParaProvider>
  );
}

export default ParaWalletProvider;
