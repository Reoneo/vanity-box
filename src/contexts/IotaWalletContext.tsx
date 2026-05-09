import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { IotaClientProvider, WalletProvider, useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets } from '@iota/dapp-kit';
import { getFullnodeUrl } from '@iota/iota-sdk/client';
import { isValidIotaAddress } from '@/hooks/usePasskeyWallet';
import '@iota/dapp-kit/dist/index.css';

// IOTA network configuration
const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  devnet: { url: getFullnodeUrl('devnet') },
};

const PASSKEY_IOTA_SESSION_KEY = 'vanity_passkey_iota_address';

// Context for IOTA wallet state — unified across extension and passkey
interface IotaWalletContextType {
  /** Real IOTA address (extension or passkey-derived) */
  address: string | null;
  isConnected: boolean;
  /** 'extension' | 'passkey' | null */
  connectionSource: 'extension' | 'passkey' | null;
  disconnect: () => void;
  connectToWallet: (walletName?: string) => void;
  availableWallets: ReturnType<typeof useWallets>;
  /** Set a passkey-derived address as the active wallet */
  setPasskeyConnected: (address: string) => void;
}

const IotaWalletContext = createContext<IotaWalletContextType>({
  address: null,
  isConnected: false,
  connectionSource: null,
  disconnect: () => {},
  connectToWallet: () => {},
  availableWallets: [],
  setPasskeyConnected: () => {},
});

export const useIotaWallet = () => useContext(IotaWalletContext);

// Inner component that uses IOTA hooks
function IotaWalletContextInner({ children }: { children: ReactNode }) {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { mutate: connectWallet } = useConnectWallet();
  const wallets = useWallets();

  // Passkey state
  const [passkeyAddr, setPasskeyAddr] = useState<string | null>(null);
  const [connectionSource, setConnectionSource] = useState<'extension' | 'passkey' | null>(null);

  // Extension takes priority when both are present; otherwise passkey
  const extensionConnected = !!currentAccount?.address;
  const isConnected = extensionConnected || !!passkeyAddr;
  const address = extensionConnected ? (currentAccount?.address || null) : passkeyAddr;

  // Track source
  useEffect(() => {
    if (extensionConnected) {
      setConnectionSource('extension');
      // Clear passkey session if extension takes over
      if (passkeyAddr) {
        sessionStorage.removeItem(PASSKEY_IOTA_SESSION_KEY);
        setPasskeyAddr(null);
      }
    } else if (passkeyAddr) {
      setConnectionSource('passkey');
    } else {
      setConnectionSource(null);
    }
  }, [extensionConnected, passkeyAddr]);

  // Restore passkey session from sessionStorage on mount
  useEffect(() => {
    if (extensionConnected) return; // extension already active
    const saved = sessionStorage.getItem(PASSKEY_IOTA_SESSION_KEY);
    if (saved && isValidIotaAddress(saved)) {
      console.log('[IotaWalletContext] Restoring passkey session:', saved);
      setPasskeyAddr(saved);
      // Notify listeners (Header, WalletConnection) that a wallet is connected
      window.dispatchEvent(new CustomEvent('wallet-connected', {
        detail: { walletAddress: saved, walletType: 'iota', source: 'passkey', username: null },
      }));
    }
  }, []); // only on mount

  // Set passkey as connected (called from PasskeyWalletModal)
  const setPasskeyConnected = useCallback((addr: string) => {
    if (!isValidIotaAddress(addr)) {
      console.warn('[IotaWalletContext] Refusing invalid passkey address:', addr);
      return;
    }
    sessionStorage.setItem(PASSKEY_IOTA_SESSION_KEY, addr);
    setPasskeyAddr(addr);
    // Dispatch events so WalletConnection and other listeners sync
    window.dispatchEvent(new CustomEvent('wallet-connected', {
      detail: { walletAddress: addr, walletType: 'iota', source: 'passkey', username: null },
    }));
    // Trigger profile load
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('load-direct-profile', {
        detail: { identifier: addr, skipSearch: true },
      }));
    }, 300);
  }, []);

  const disconnect = useCallback(() => {
    if (connectionSource === 'extension' || extensionConnected) {
      disconnectWallet();
    }
    // Always clear passkey
    sessionStorage.removeItem(PASSKEY_IOTA_SESSION_KEY);
    setPasskeyAddr(null);
    setConnectionSource(null);
    window.dispatchEvent(new CustomEvent('wallet-disconnected', { detail: { walletType: 'iota' } }));
  }, [connectionSource, extensionConnected, disconnectWallet]);

  const connectToWallet = useCallback((walletName?: string) => {
    if (walletName) {
      const wallet = wallets.find(w => w.name.toLowerCase().includes(walletName.toLowerCase()));
      if (wallet) {
        connectWallet({ wallet });
        return;
      }
    }
    // If no specific wallet or wallet not found, the modal will be shown
  }, [wallets, connectWallet]);

  const contextValue: IotaWalletContextType = {
    address,
    isConnected,
    connectionSource,
    disconnect,
    connectToWallet,
    availableWallets: wallets,
    setPasskeyConnected,
  };

  return (
    <IotaWalletContext.Provider value={contextValue}>
      {children}
    </IotaWalletContext.Provider>
  );
}

// Main IOTA provider
export function IotaWalletProvider({ children }: { children: ReactNode }) {
  const isInSpecialApp = typeof window !== 'undefined' && (
    !!(window as any).Telegram?.WebApp ||
    typeof (window as any).WorldApp !== 'undefined'
  );

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
