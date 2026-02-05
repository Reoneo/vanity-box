import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { IotaClientProvider, WalletProvider, useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets, useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { getFullnodeUrl, Network } from '@iota/iota-sdk/client';
import { IotaNamesClient, IotaNamesTransaction } from '@iota/iota-names-sdk';
import { IotaGraphQLClient } from '@iota/iota-sdk/graphql';
import { Transaction } from '@iota/iota-sdk/transactions';
import '@iota/dapp-kit/dist/index.css';

// IOTA network configuration
const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  devnet: { url: getFullnodeUrl('devnet') },
};

// Context for IOTA wallet state
interface SetTargetAddressParams {
  nftId: string;
  address: string;
  isSubname: boolean;
}

interface IotaWalletContextType {
  address: string | null;
  isConnected: boolean;
  disconnect: () => void;
  connectToWallet: (walletName?: string) => void;
  availableWallets: ReturnType<typeof useWallets>;
  setIotaNameTargetAddress: (params: SetTargetAddressParams) => Promise<void>;
}

const IotaWalletContext = createContext<IotaWalletContextType>({
  address: null,
  isConnected: false,
  disconnect: () => {},
  connectToWallet: () => {},
  availableWallets: [],
  setIotaNameTargetAddress: async () => {},
});

export const useIotaWallet = () => useContext(IotaWalletContext);

// Inner component that uses IOTA hooks
function IotaWalletContextInner({ children }: { children: ReactNode }) {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { mutate: connectWallet } = useConnectWallet();
  const wallets = useWallets();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

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

  const setIotaNameTargetAddress = useCallback(async (params: SetTargetAddressParams) => {
    const { nftId, address: targetAddress, isSubname } = params;

    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    console.log('Setting target address:', { nftId, targetAddress, isSubname });

    // Initialize IOTA Names client
    const graphQlClient = new IotaGraphQLClient({
      url: 'https://graphql.mainnet.iota.cafe',
    });
    
    const iotaNamesClient = new IotaNamesClient({
      graphQlClient,
      network: Network.Mainnet,
    });

    // Create transaction
    const tx = new Transaction();
    const iotaNamesTx = new IotaNamesTransaction(iotaNamesClient, tx);

    // Set target address
    iotaNamesTx.setTargetAddress({
      nft: nftId,
      address: targetAddress,
      isSubname,
    });

    // Sign and execute the transaction - pass the Transaction object directly
    // The wallet adapter handles serialization internally
    const result = await signAndExecuteTransaction({
      transaction: tx as any, // Type assertion due to SDK version mismatch
    });

    console.log('Transaction result:', result);
  }, [currentAccount, signAndExecuteTransaction]);

  const contextValue: IotaWalletContextType = {
    address,
    isConnected,
    disconnect,
    connectToWallet,
    availableWallets: wallets,
    setIotaNameTargetAddress,
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
