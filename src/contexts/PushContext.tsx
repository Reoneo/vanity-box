import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PushAPI, CONSTANTS } from '@pushprotocol/restapi';
import { authenticateWithWorldChain } from '@/lib/pushAuth';
import { toast } from 'sonner';

interface PushContextType {
  pushUser: PushAPI | null;
  isConnected: boolean;
  isInitializing: boolean;
  walletAddress: string | null;
  initializePush: () => Promise<void>;
  disconnect: () => void;
}

const PushContext = createContext<PushContextType | undefined>(undefined);

export const usePush = () => {
  const context = useContext(PushContext);
  if (!context) {
    throw new Error('usePush must be used within a PushProvider');
  }
  return context;
};

interface PushProviderProps {
  children: ReactNode;
}

export const PushProvider: React.FC<PushProviderProps> = ({ children }) => {
  const [pushUser, setPushUser] = useState<PushAPI | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const initializePush = async () => {
    if (isInitializing || isConnected) {
      console.log('⏭️ Push already initializing or connected');
      return;
    }

    setIsInitializing(true);
    console.log('🚀 Initializing Push Protocol...');

    try {
      // Authenticate with World Chain and get signer
      const { address, signer } = await authenticateWithWorldChain();
      console.log('✅ Authentication successful:', address);

      // Initialize Push Protocol user
      console.log('🔄 Creating Push Protocol user...');
      const user = await PushAPI.initialize(signer as any, {
        env: CONSTANTS.ENV.PROD
      });

      console.log('✅ Push Protocol user initialized');
      
      setPushUser(user);
      setWalletAddress(address);
      setIsConnected(true);
      
      toast.success('Connected to Push Protocol');
    } catch (error: any) {
      console.error('❌ Failed to initialize Push Protocol:', error);
      toast.error(error?.message || 'Failed to connect to Push Protocol');
      
      setPushUser(null);
      setWalletAddress(null);
      setIsConnected(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const disconnect = () => {
    console.log('🔌 Disconnecting from Push Protocol');
    setPushUser(null);
    setWalletAddress(null);
    setIsConnected(false);
    toast.info('Disconnected from Push Protocol');
  };

  const value: PushContextType = {
    pushUser,
    isConnected,
    isInitializing,
    walletAddress,
    initializePush,
    disconnect
  };

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
};
