import React, { createContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Define Aptos wallet types
interface AptosAccount {
  address: string;
  publicKey: string;
}

interface AptosNetwork {
  name: string;
  chainId?: string;
  url?: string;
}

interface AptosWindow {
  aptos?: {
    connect: () => Promise<AptosAccount>;
    disconnect: () => Promise<void>;
    account: () => Promise<AptosAccount>;
    network: () => Promise<AptosNetwork>;
    isConnected: () => Promise<boolean>;
    signAndSubmitTransaction: (transaction: any) => Promise<any>;
    signTransaction: (transaction: any) => Promise<any>;
    signMessage: (payload: SignMessagePayload) => Promise<SignMessageResponse>;
    onAccountChange: (callback: (account: AptosAccount | null) => void) => void;
    onNetworkChange: (callback: (network: AptosNetwork) => void) => void;
    onDisconnect: (callback: () => void) => void;
  };
}

interface SignMessagePayload {
  address?: boolean;
  application?: boolean;
  chainId?: boolean;
  message: string;
  nonce: string;
}

interface SignMessageResponse {
  address: string;
  application: string;
  chainId: number;
  fullMessage: string;
  message: string;
  nonce: string;
  prefix: string;
  signature: string;
}

interface PetraWalletContextType {
  account: AptosAccount | null;
  network: AptosNetwork | null;
  isConnected: boolean;
  isInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (transaction: any) => Promise<any>;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (payload: SignMessagePayload) => Promise<SignMessageResponse>;
}

export const PetraWalletContext = createContext<PetraWalletContextType | undefined>(undefined);

export const PetraWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<AptosAccount | null>(null);
  const [network, setNetwork] = useState<AptosNetwork | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const getAptosProvider = useCallback(() => {
    return (window as unknown as AptosWindow).aptos ?? null;
  }, []);

  const waitForAptosProvider = useCallback(async (timeoutMs = 7000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const provider = getAptosProvider();
      if (provider) return provider;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  }, [getAptosProvider]);

  const checkConnection = useCallback(async () => {
    const windowAptos = getAptosProvider();
    if (!windowAptos) {
      setIsInstalled(false);
      setIsConnected(false);
      setAccount(null);
      setNetwork(null);
      return;
    }

    setIsInstalled(true);

    try {
      const connected = await windowAptos.isConnected();
      if (!connected) {
        setIsConnected(false);
        setAccount(null);
        setNetwork(null);
        return;
      }

      const [currentAccount, currentNetwork] = await Promise.all([
        windowAptos.account(),
        windowAptos.network(),
      ]);
      setAccount(currentAccount);
      setNetwork(currentNetwork);
      setIsConnected(true);
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  }, [getAptosProvider]);

  // Check if Petra is installed (browser extension or mobile in-app browser)
  useEffect(() => {
    let mounted = true;

    const checkPetraInstalled = () => {
      if (!mounted) return;
      const hasPetra = !!getAptosProvider();
      setIsInstalled(hasPetra);

      if (!hasPetra) {
        console.log('Petra wallet not detected in browser context');
      } else {
        console.log('Petra wallet detected');
      }
    };

    checkPetraInstalled();

    // Re-check for delayed mobile injection and app foregrounding
    const timeouts = [500, 1500, 3000, 5000, 8000].map((ms) =>
      setTimeout(checkPetraInstalled, ms)
    );

    const handleVisibilityOrFocus = () => {
      checkPetraInstalled();
      checkConnection();
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      mounted = false;
      timeouts.forEach(clearTimeout);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [getAptosProvider, checkConnection]);

  // Set up event listeners
  useEffect(() => {
    const windowAptos = getAptosProvider();
    if (!windowAptos) return;

    setIsInstalled(true);

    // Listen for account changes
    const handleAccountChange = (newAccount: AptosAccount | null) => {
      console.log('Account changed:', newAccount);
      if (newAccount) {
        setAccount(newAccount);
        setIsConnected(true);
      } else {
        setAccount(null);
        setIsConnected(false);
      }
    };

    // Listen for network changes
    const handleNetworkChange = (newNetwork: AptosNetwork) => {
      console.log('Network changed:', newNetwork);
      setNetwork(newNetwork);
    };

    // Listen for disconnect
    const handleDisconnect = () => {
      console.log('Wallet disconnected');
      setAccount(null);
      setIsConnected(false);
      setNetwork(null);
    };

    windowAptos.onAccountChange(handleAccountChange);
    windowAptos.onNetworkChange(handleNetworkChange);
    windowAptos.onDisconnect(handleDisconnect);

    // Check if already connected
    checkConnection();
  }, [isInstalled, getAptosProvider, checkConnection]);

  const connect = useCallback(async () => {
    const windowAptos = await waitForAptosProvider();

    if (!windowAptos) {
      setIsInstalled(false);
      setIsConnected(false);
      setAccount(null);
      setNetwork(null);
      toast.error('Petra wallet not found. Open this page in Petra app or install Petra extension.');
      return;
    }

    setIsInstalled(true);

    try {
      const alreadyConnected = await windowAptos.isConnected().catch(() => false);
      if (!alreadyConnected) {
        await windowAptos.connect();
      }

      const [currentAccount, currentNetwork] = await Promise.all([
        windowAptos.account(),
        windowAptos.network(),
      ]);

      setAccount(currentAccount);
      setNetwork(currentNetwork);
      setIsConnected(true);

      toast.success('Successfully connected to Petra wallet');
    } catch (error: any) {
      console.error('Error connecting to Petra:', error);

      if (error?.code === 4001) {
        toast.error('Connection rejected by user');
      } else {
        toast.error('Failed to connect to Petra wallet');
      }

      throw error;
    }
  }, [waitForAptosProvider]);

  const disconnect = useCallback(async () => {
    const windowAptos = getAptosProvider();
    
    if (!windowAptos) return;

    try {
      await windowAptos.disconnect();
      setAccount(null);
      setNetwork(null);
      setIsConnected(false);
      
      toast.success('Disconnected from Petra wallet');
    } catch (error) {
      console.error('Error disconnecting from Petra:', error);
      toast.error('Failed to disconnect from Petra wallet');
    }
  }, [getAptosProvider]);

  const ensureConnectedProvider = useCallback(async () => {
    const windowAptos = await waitForAptosProvider();

    if (!windowAptos) {
      throw new Error('Petra wallet not found. Open this page in Petra app or install Petra extension.');
    }

    let connected = await windowAptos.isConnected().catch(() => false);
    if (!connected) {
      await windowAptos.connect();
      connected = await windowAptos.isConnected().catch(() => false);
    }

    if (!connected) {
      throw new Error('Petra wallet not connected');
    }

    const [currentAccount, currentNetwork] = await Promise.all([
      windowAptos.account(),
      windowAptos.network(),
    ]);

    setAccount(currentAccount);
    setNetwork(currentNetwork);
    setIsConnected(true);
    setIsInstalled(true);

    return windowAptos;
  }, [waitForAptosProvider]);

  const signAndSubmitTransaction = useCallback(async (transaction: any) => {
    const windowAptos = await ensureConnectedProvider();

    try {
      const pendingTransaction = await windowAptos.signAndSubmitTransaction(transaction);
      console.log('Transaction submitted:', pendingTransaction);
      return pendingTransaction;
    } catch (error: any) {
      console.error('Error signing and submitting transaction:', error);
      
      if (error.code === 4001) {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  }, [ensureConnectedProvider]);

  const signTransaction = useCallback(async (transaction: any) => {
    const windowAptos = await ensureConnectedProvider();

    try {
      const signedTransaction = await windowAptos.signTransaction(transaction);
      console.log('Transaction signed:', signedTransaction);
      return signedTransaction;
    } catch (error: any) {
      console.error('Error signing transaction:', error);
      
      if (error.code === 4001) {
        throw new Error('Transaction signing rejected by user');
      }
      throw error;
    }
  }, [ensureConnectedProvider]);

  const signMessage = useCallback(async (payload: SignMessagePayload) => {
    const windowAptos = await ensureConnectedProvider();

    try {
      const response = await windowAptos.signMessage(payload);
      console.log('Message signed:', response);
      return response;
    } catch (error: any) {
      console.error('Error signing message:', error);
      
      if (error.code === 4001) {
        throw new Error('Message signing rejected by user');
      }
      throw error;
    }
  }, [ensureConnectedProvider]);

  const value: PetraWalletContextType = {
    account,
    network,
    isConnected,
    isInstalled,
    connect,
    disconnect,
    signAndSubmitTransaction,
    signTransaction,
    signMessage,
  };

  return (
    <PetraWalletContext.Provider value={value}>
      {children}
    </PetraWalletContext.Provider>
  );
};
