import React, { createContext, useContext } from 'react';
import {
  AptosWalletAdapterProvider,
  useWallet,
} from '@aptos-labs/wallet-adapter-react';

// Re-export the adapter's useWallet as our context value
export interface AptosAdapterWallet {
  name: string;
  icon?: string;
  url?: string;
  isInstalled: boolean;
}

interface PetraWalletContextType {
  account: { address: string; publicKey: string } | null;
  network: { name: string; chainId?: string; url?: string } | null;
  isConnected: boolean;
  isInstalled: boolean;
  /** All Aptos wallets known to the adapter (installed + discoverable). */
  wallets: AptosAdapterWallet[];
  connect: (walletName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (transaction: any) => Promise<any>;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (payload: {
    address?: boolean;
    application?: boolean;
    chainId?: boolean;
    message: string;
    nonce: string;
  }) => Promise<any>;
}

export const PetraWalletContext = createContext<PetraWalletContextType | undefined>(undefined);

function PetraWalletBridge({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();

  const value: PetraWalletContextType = {
    account: wallet.account
      ? { address: String(wallet.account.address), publicKey: String(wallet.account.publicKey ?? '') }
      : null,
    network: wallet.network
      ? { name: wallet.network.name ?? 'unknown', chainId: String(wallet.network.chainId ?? ''), url: wallet.network.url }
      : null,
    isConnected: wallet.connected,
    isInstalled: wallet.wallets.some(
      (w) => 'readyState' in w ? (w as any).readyState === 'Installed' : true
    ),
    wallets: wallet.wallets.map((w: any) => ({
      name: w.name,
      icon: w.icon,
      url: w.url,
      isInstalled: 'readyState' in w ? w.readyState === 'Installed' : true,
    })),
    connect: async (walletName?: string) => {
      const name = walletName ?? 'Petra';
      await wallet.connect(name as any);
    },
    disconnect: async () => {
      await wallet.disconnect();
    },
    signAndSubmitTransaction: async (transaction: any) => {
      return wallet.signAndSubmitTransaction(transaction);
    },
    signTransaction: async (transaction: any) => {
      // The adapter may not expose signTransaction separately; fall back
      if ((wallet as any).signTransaction) {
        return (wallet as any).signTransaction(transaction);
      }
      throw new Error('signTransaction not supported by the connected wallet');
    },
    signMessage: async (payload) => {
      return wallet.signMessage(payload as any);
    },
  };

  return (
    <PetraWalletContext.Provider value={value}>
      {children}
    </PetraWalletContext.Provider>
  );
}

export const PetraWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      optInWallets={['Continue with Google', 'Continue with Apple'] as any}
      dappConfig={{
        network: 'mainnet' as any,
        aptosConnect: {
          dappId: 'vanity-box',
        },
      }}
      onError={(error) => console.error('Aptos wallet adapter error:', error)}
    >
      <PetraWalletBridge>{children}</PetraWalletBridge>
    </AptosWalletAdapterProvider>
  );
};
