import React, { createContext, useContext, ReactNode } from 'react';
import { IotaClientProvider, WalletProvider, useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets } from '@iota/dapp-kit';
import { getFullnodeUrl } from '@iota/iota-sdk/client';
import '@iota/dapp-kit/dist/index.css';

// IOTA network configuration
const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  devnet: { url: getFullnodeUrl('devnet') },
};

// Context for IOTA wallet state
interface IotaWalletContextType {
  address: string | null;
  isConnected: boolean;
  disconnect: () => void;
  connectToWallet: (walletName?: string) => void;
  availableWallets: ReturnType<typeof useWallets>;
}

const IotaWalletContext = createContext<IotaWalletContextType>({
  address: null,
  isConnected: false,
  disconnect: () => {},
  connectToWallet: () => {},
  availableWallets: [],
});

export const useIotaWallet = () => useContext(IotaWalletContext);

// Inner component that uses IOTA hooks
function IotaWalletContextInner({ children }: { children: ReactNode }) {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { mutate: connectWallet } = useConnectWallet();
  const wallets = useWallets();

  const isConnected = !!currentAccount?.address;
  const address = currentAccount?.address || null;

  const disconnect = () => {
    disconnectWallet();
    window.dispatchEvent(new CustomEvent('wallet-disconnected'));
  };

  const connectToWallet = (walletName?: string) => {
    if (walletName) {
      const wallet = wallets.find(w => w.name.toLowerCase().includes(walletName.toLowerCase()));
      if (wallet) {
        connectWallet({ wallet });
        return;
      }
    }
    // If no specific wallet or wallet not found, the modal will be shown
  };

  const contextValue: IotaWalletContextType = {
    address,
    isConnected,
    disconnect,
    connectToWallet,
    availableWallets: wallets,
  };

  return (
    <IotaWalletContext.Provider value={contextValue}>
      {children}
    </IotaWalletContext.Provider>
  );
}

// Main IOTA provider - only render IOTA providers on web browsers (not mobile phones)
export function IotaWalletProvider({ children }: { children: ReactNode }) {
  // Check if we're on mobile phone or in a special environment (Telegram, World App)
  // Include iPad/tablets as desktop since they can use browser extensions
  const isMobilePhone = typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isInSpecialApp = typeof window !== 'undefined' && (
    !!(window as any).Telegram?.WebApp ||
    typeof (window as any).WorldApp !== 'undefined'
  );

  // Skip IOTA providers on mobile phone/app environments
  if (isMobilePhone || isInSpecialApp) {
    return <>{children}</>;
  }

  return (
    <IotaClientProvider networks={networks} defaultNetwork="mainnet">
      <WalletProvider autoConnect>
        <IotaWalletContextInner>
          {children}
        </IotaWalletContextInner>
      </WalletProvider>
    </IotaClientProvider>
  );
}
