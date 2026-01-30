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

// Main IOTA provider - render on all browsers except special apps (Telegram, World App)
export function IotaWalletProvider({ children }: { children: ReactNode }) {
  // Check if we're in a special environment (Telegram, World App)
  // These have their own wallet flows, so skip IOTA providers there
  // Mobile browsers are now supported for IOTA wallet connection
  const isInSpecialApp = typeof window !== 'undefined' && (
    !!(window as any).Telegram?.WebApp ||
    typeof (window as any).WorldApp !== 'undefined'
  );

  // Skip IOTA providers only in special app environments
  if (isInSpecialApp) {
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
