import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { ParaProvider as ParaSDKProvider, useModal, OAuthMethod, AuthLayout } from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";

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
      isModalOpen: isOpen
    }}>
      {children}
    </ParaContext.Provider>
  );
};

interface ParaWalletProviderProps {
  children: ReactNode;
}

const PARA_API_KEY = import.meta.env.VITE_PARA_API_KEY || '';

export const ParaWalletProvider: React.FC<ParaWalletProviderProps> = ({ children }) => {
  // If no API key, just render children with a placeholder context
  if (!PARA_API_KEY) {
    console.warn('Para API key not configured. Para wallet connection will be disabled.');
    return (
      <ParaContext.Provider value={{
        wallet: { address: null, isConnected: false, chainId: null },
        setWallet: () => {},
        disconnect: () => {},
        openParaModal: () => console.warn('Para API key not configured'),
        closeParaModal: () => {},
        isModalOpen: false
      }}>
        {children}
      </ParaContext.Provider>
    );
  }

  return (
    <ParaSDKProvider
      paraClientConfig={{
        apiKey: PARA_API_KEY,
        env: "PROD" as any,
      }}
      config={{
        appName: 'Vanity.box',
      }}
      paraModalConfig={{
        logo: "/vanity-box-logo.png",
        theme: {
          foregroundColor: "#FFFFFF",
          backgroundColor: "#000000",
          accentColor: "#7C3AED",
          darkForegroundColor: "#FFFFFF",
          darkBackgroundColor: "#1A1A1A",
          darkAccentColor: "#7C3AED",
          mode: "dark",
          borderRadius: "md",
          font: "Inter"
        },
        oAuthMethods: [
          OAuthMethod.GOOGLE,
          OAuthMethod.TWITTER,
          OAuthMethod.DISCORD,
          OAuthMethod.APPLE
        ],
        authLayout: [AuthLayout.EXTERNAL_FULL, AuthLayout.AUTH_FULL],
      }}
    >
      <ParaWalletStateManager>
        {children}
      </ParaWalletStateManager>
    </ParaSDKProvider>
  );
};

export default ParaWalletProvider;
