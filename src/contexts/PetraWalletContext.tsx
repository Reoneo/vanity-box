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

  // Check if Petra is installed (browser extension or mobile in-app browser)
  useEffect(() => {
    const checkPetraInstalled = () => {
      const windowAptos = (window as unknown as AptosWindow).aptos;
      // Also check for Petra mobile via petrewallet deeplink capability
      const hasPetra = !!windowAptos;
      setIsInstalled(hasPetra);
      
      if (!hasPetra) {
        console.log('Petra wallet not detected in browser context');
      } else {
        console.log('Petra wallet detected');
      }
    };

    checkPetraInstalled();
    // Check again after a longer delay for mobile wallets that inject slowly
    const timeout1 = setTimeout(checkPetraInstalled, 1000);
    const timeout2 = setTimeout(checkPetraInstalled, 2500);
    
    return () => { clearTimeout(timeout1); clearTimeout(timeout2); };
  }, []);

  // Set up event listeners
  useEffect(() => {
    const windowAptos = (window as unknown as AptosWindow).aptos;
    if (!windowAptos) return;

    // Listen for account changes
    const handleAccountChange = (newAccount: AptosAccount | null) => {
      console.log('Account changed:', newAccount);
      if (newAccount) {
        setAccount(newAccount);
        setIsConnected(true);
      } else {
        // User switched to a new account that hasn't connected yet
        connect();
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
  }, [isInstalled]);

  const checkConnection = async () => {
    const windowAptos = (window as unknown as AptosWindow).aptos;
    if (!windowAptos) return;

    try {
      const connected = await windowAptos.isConnected();
      if (connected) {
        const currentAccount = await windowAptos.account();
        const currentNetwork = await windowAptos.network();
        setAccount(currentAccount);
        setNetwork(currentNetwork);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connect = useCallback(async () => {
    const windowAptos = (window as unknown as AptosWindow).aptos;
    
    if (!windowAptos) {
      toast.error('Petra wallet not found. Please install Petra wallet extension.');
      return;
    }

    try {
      const response = await windowAptos.connect();
      console.log('Connected to Petra:', response);

      const currentAccount = await windowAptos.account();
      const currentNetwork = await windowAptos.network();

      setAccount(currentAccount);
      setNetwork(currentNetwork);
      setIsConnected(true);
      
      toast.success('Successfully connected to Petra wallet');
    } catch (error: any) {
      console.error('Error connecting to Petra:', error);
      
      if (error.code === 4001) {
        toast.error('Connection rejected by user');
      } else {
        toast.error('Failed to connect to Petra wallet');
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    const windowAptos = (window as unknown as AptosWindow).aptos;
    
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
  }, []);

  const ensureConnectedProvider = useCallback(async () => {
    const windowAptos = (window as unknown as AptosWindow).aptos;

    if (!windowAptos) {
      throw new Error('Petra wallet not found');
    }

    const runtimeConnected = await windowAptos.isConnected().catch(() => false);
    if (!runtimeConnected) {
      throw new Error('Petra wallet not connected');
    }

    return windowAptos;
  }, []);

  const signAndSubmitTransaction = useCallback(async (transaction: any) => {
    try {
      const windowAptos = await ensureConnectedProvider();
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
    try {
      const windowAptos = await ensureConnectedProvider();
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
    try {
      const windowAptos = await ensureConnectedProvider();
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
