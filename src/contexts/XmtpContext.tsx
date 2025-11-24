import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Client } from '@xmtp/browser-sdk';
import { toast } from 'sonner';

interface XmtpContextType {
  client: Client | null;
  isInitializing: boolean;
  isConnected: boolean;
  walletAddress: string | null;
  initializeClient: (signer: any, address: string) => Promise<void>;
  disconnectClient: () => void;
}

const XmtpContext = createContext<XmtpContextType | undefined>(undefined);

export const XmtpProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const initializeClient = useCallback(async (signer: any, address: string) => {
    if (client || isInitializing) return;

    setIsInitializing(true);
    try {
      console.log('🔄 Initializing XMTP client for address:', address);
      
      const newClient = await Client.create(signer, {
        env: 'production'
      });
      
      console.log('✅ XMTP client initialized');
      setClient(newClient);
      setWalletAddress(address);
      toast.success('Connected to XMTP messaging');
    } catch (error) {
      console.error('❌ Failed to initialize XMTP client:', error);
      toast.error('Failed to connect to XMTP messaging');
    } finally {
      setIsInitializing(false);
    }
  }, [client, isInitializing]);

  const disconnectClient = useCallback(() => {
    setClient(null);
    setWalletAddress(null);
    toast.info('Disconnected from XMTP');
  }, []);

  return (
    <XmtpContext.Provider
      value={{
        client,
        isInitializing,
        isConnected: !!client,
        walletAddress,
        initializeClient,
        disconnectClient
      }}
    >
      {children}
    </XmtpContext.Provider>
  );
};

export const useXmtp = () => {
  const context = useContext(XmtpContext);
  if (context === undefined) {
    throw new Error('useXmtp must be used within XmtpProvider');
  }
  return context;
};
