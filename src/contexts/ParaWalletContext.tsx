import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';

interface ParaWalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
  // Control whether Para is enabled/mounted
  paraEnabled: boolean;
  enablePara: () => void;
  disablePara: () => void;
  // Track readiness
  isParaReady: boolean;
  setParaReady: (ready: boolean) => void;
  // Store modal functions from inner provider
  registerModalFunctions: (open: () => void, close: () => void) => void;
  // Pending modal open
  pendingOpenModal: boolean;
  setPendingOpenModal: (pending: boolean) => void;
}

const defaultContext: ParaWalletContextType = {
  isConnected: false,
  walletAddress: null,
  openModal: () => {},
  closeModal: () => {},
  isModalOpen: false,
  paraEnabled: false,
  enablePara: () => {},
  disablePara: () => {},
  isParaReady: false,
  setParaReady: () => {},
  registerModalFunctions: () => {},
  pendingOpenModal: false,
  setPendingOpenModal: () => {},
};

const ParaWalletContext = createContext<ParaWalletContextType>(defaultContext);

export const useParaWallet = () => useContext(ParaWalletContext);

interface ParaWalletProviderProps {
  children: React.ReactNode;
}

/**
 * Root Para wallet context that manages the Para enable/disable state
 * and coordinates between the outer (safe) context and inner (Para hooks) context.
 */
export const ParaWalletContextProvider: React.FC<ParaWalletProviderProps> = ({ children }) => {
  const [paraEnabled, setParaEnabled] = useState(false);
  const [isParaReady, setParaReady] = useState(false);
  const [pendingOpenModal, setPendingOpenModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Store modal functions from inner provider
  const modalFunctionsRef = useRef<{ open: () => void; close: () => void } | null>(null);

  const enablePara = useCallback(() => {
    console.log('[ParaWallet] Enabling Para...');
    setParaEnabled(true);
  }, []);

  const disablePara = useCallback(() => {
    console.log('[ParaWallet] Disabling Para...');
    setParaEnabled(false);
    setParaReady(false);
    setIsConnected(false);
    setWalletAddress(null);
    modalFunctionsRef.current = null;
  }, []);

  const registerModalFunctions = useCallback((open: () => void, close: () => void) => {
    console.log('[ParaWallet] Modal functions registered');
    modalFunctionsRef.current = { open, close };
  }, []);

  const openModal = useCallback(() => {
    if (modalFunctionsRef.current?.open) {
      console.log('[ParaWallet] Opening modal via registered function');
      modalFunctionsRef.current.open();
    } else {
      console.warn('[ParaWallet] Cannot open modal - Para not ready yet');
    }
  }, []);

  const closeModal = useCallback(() => {
    if (modalFunctionsRef.current?.close) {
      modalFunctionsRef.current.close();
    }
  }, []);

  // When Para becomes ready and we have a pending modal open, trigger it
  useEffect(() => {
    if (isParaReady && pendingOpenModal && modalFunctionsRef.current?.open) {
      console.log('[ParaWallet] Para ready, opening pending modal...');
      const timer = setTimeout(() => {
        modalFunctionsRef.current?.open();
        setPendingOpenModal(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isParaReady, pendingOpenModal]);

  const value = useMemo(() => ({
    isConnected,
    walletAddress,
    openModal,
    closeModal,
    isModalOpen,
    paraEnabled,
    enablePara,
    disablePara,
    isParaReady,
    setParaReady,
    registerModalFunctions,
    pendingOpenModal,
    setPendingOpenModal,
  }), [
    isConnected, walletAddress, openModal, closeModal, isModalOpen,
    paraEnabled, enablePara, disablePara, isParaReady, registerModalFunctions,
    pendingOpenModal
  ]);

  return (
    <ParaWalletContext.Provider value={value}>
      {children}
    </ParaWalletContext.Provider>
  );
};

/**
 * Updates the outer context with connection state from Para hooks.
 * Must be used inside ParaProvider.
 */
interface ParaConnectionBridgeProps {
  children: React.ReactNode;
  onConnectionChange?: (isConnected: boolean, address: string | null) => void;
}

export const ParaConnectionBridge: React.FC<ParaConnectionBridgeProps> = ({ 
  children, 
  onConnectionChange 
}) => {
  // Import Para hooks dynamically to avoid issues when not in ParaProvider
  const paraHooks = require('@getpara/react-sdk-lite');
  const { useAccount, useModal, useWallet } = paraHooks;
  
  const { isConnected, embedded, external } = useAccount();
  const { openModal, closeModal, isOpen } = useModal();
  const walletQuery = useWallet();
  const parentContext = useParaWallet();

  // Calculate wallet address
  const walletAddress = useMemo(() => {
    if (embedded?.wallets && embedded.wallets.length > 0) {
      const evmWallet = Object.values(embedded.wallets).find((w: any) => w.type === 'EVM');
      if (evmWallet) return (evmWallet as any).address || null;
      return (embedded.wallets[0] as any).address || null;
    }
    if (walletQuery.data?.address) {
      return walletQuery.data.address;
    }
    if (external?.evm?.address) {
      return external.evm.address as string;
    }
    return null;
  }, [embedded, walletQuery.data, external]);

  // Register modal functions with parent context
  useEffect(() => {
    console.log('[ParaBridge] Registering modal functions');
    parentContext.registerModalFunctions(openModal, closeModal);
    parentContext.setParaReady(true);
    
    return () => {
      parentContext.setParaReady(false);
    };
  }, [openModal, closeModal]);

  // Notify parent of connection changes
  useEffect(() => {
    console.log('[ParaBridge] Connection state:', { isConnected, walletAddress });
    onConnectionChange?.(isConnected, walletAddress);
  }, [isConnected, walletAddress, onConnectionChange]);

  // Provide updated context values to children
  const value = useMemo(() => ({
    ...parentContext,
    isConnected,
    walletAddress,
    isModalOpen: isOpen,
    openModal: () => openModal(),
    closeModal,
    isParaReady: true,
  }), [parentContext, isConnected, walletAddress, isOpen, openModal, closeModal]);

  return (
    <ParaWalletContext.Provider value={value}>
      {children}
    </ParaWalletContext.Provider>
  );
};
