import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

interface ParaWalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
  // New: control whether Para is enabled/mounted
  paraEnabled: boolean;
  enablePara: () => void;
  disablePara: () => void;
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
};

const ParaWalletContext = createContext<ParaWalletContextType>(defaultContext);

export const useParaWallet = () => useContext(ParaWalletContext);

interface ParaWalletProviderProps {
  children: React.ReactNode;
}

/**
 * Safe ParaWalletContextProvider that works WITHOUT ParaProvider mounted.
 * Para hooks are only called inside ParaWalletContextInner which is rendered
 * conditionally after Para is enabled and mounted.
 */
export const ParaWalletContextProvider: React.FC<ParaWalletProviderProps> = ({ children }) => {
  const [paraEnabled, setParaEnabled] = useState(false);

  const enablePara = useCallback(() => {
    console.log('[ParaWallet] Enabling Para...');
    setParaEnabled(true);
  }, []);

  const disablePara = useCallback(() => {
    console.log('[ParaWallet] Disabling Para...');
    setParaEnabled(false);
  }, []);

  // When Para is NOT enabled, provide safe defaults
  const value = useMemo(() => ({
    isConnected: false,
    walletAddress: null,
    openModal: () => {
      console.warn('[ParaWallet] Cannot open modal - Para not enabled. Call enablePara() first.');
    },
    closeModal: () => {},
    isModalOpen: false,
    paraEnabled,
    enablePara,
    disablePara,
  }), [paraEnabled, enablePara, disablePara]);

  return (
    <ParaWalletContext.Provider value={value}>
      {children}
    </ParaWalletContext.Provider>
  );
};

/**
 * Inner component that uses Para hooks - ONLY render this inside ParaProvider!
 */
interface ParaWalletInnerProviderProps {
  children: React.ReactNode;
  onDisconnect?: () => void;
}

export const ParaWalletInnerProvider: React.FC<ParaWalletInnerProviderProps> = ({ children, onDisconnect }) => {
  // These hooks are safe here because this component is only rendered inside ParaProvider
  const { useAccount, useModal, useWallet } = require('@getpara/react-sdk-lite');
  
  const { isConnected, embedded, external } = useAccount();
  const { openModal, closeModal, isOpen } = useModal();
  const walletQuery = useWallet();

  // Get the wallet address - prefer embedded wallet, then external EVM
  const walletAddress = useMemo(() => {
    // Check embedded wallet first
    if (embedded?.wallets && embedded.wallets.length > 0) {
      const evmWallet = Object.values(embedded.wallets).find((w: any) => w.type === 'EVM');
      if (evmWallet) return (evmWallet as any).address || null;
      return (embedded.wallets[0] as any).address || null;
    }
    // Check query data
    if (walletQuery.data?.address) {
      return walletQuery.data.address;
    }
    // Check external EVM wallet
    if (external?.evm?.address) {
      return external.evm.address as string;
    }
    return null;
  }, [embedded, walletQuery.data, external]);

  const value = useMemo(() => ({
    isConnected,
    walletAddress,
    openModal: () => openModal(),
    closeModal,
    isModalOpen: isOpen,
    paraEnabled: true,
    enablePara: () => {},
    disablePara: onDisconnect || (() => {}),
  }), [isConnected, walletAddress, openModal, closeModal, isOpen, onDisconnect]);

  return (
    <ParaWalletContext.Provider value={value}>
      {children}
    </ParaWalletContext.Provider>
  );
};
