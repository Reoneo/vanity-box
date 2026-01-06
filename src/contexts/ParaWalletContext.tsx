import React, { createContext, useContext, useMemo } from 'react';
import { useAccount, useModal, useWallet } from '@getpara/react-sdk';

interface ParaWalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
}

const ParaWalletContext = createContext<ParaWalletContextType>({
  isConnected: false,
  walletAddress: null,
  openModal: () => {},
  closeModal: () => {},
  isModalOpen: false,
});

export const useParaWallet = () => useContext(ParaWalletContext);

interface ParaWalletProviderProps {
  children: React.ReactNode;
}

export const ParaWalletContextProvider: React.FC<ParaWalletProviderProps> = ({ children }) => {
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
  }), [isConnected, walletAddress, openModal, closeModal, isOpen]);

  return (
    <ParaWalletContext.Provider value={value}>
      {children}
    </ParaWalletContext.Provider>
  );
};
