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
    if (client || isInitializing) {
      console.log('⚠️ Client already exists or initializing, skipping');
      return;
    }

    setIsInitializing(true);
    try {
      console.log('🔄 Initializing XMTP client for:', address);
      
      // Create client for production network
      const newClient = await Client.create(signer, {
        env: 'production'
      });
      
      console.log('✅ XMTP client initialized - inbox ID:', newClient.inboxId);
      setClient(newClient);
      setWalletAddress(address);
    } catch (error: any) {
      console.error('❌ Failed to initialize XMTP client:', error);
      setClient(null);
      setWalletAddress(null);
      
      // Provide helpful error messages
      let errorMsg = 'Failed to connect to XMTP';
      if (error.message?.includes('installation')) {
        errorMsg = 'Installation limit reached. Try clearing browser data.';
      } else if (error.message) {
        errorMsg += ': ' + error.message;
      }
      
      toast.error(errorMsg);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [client, isInitializing]);

  const disconnectClient = useCallback(() => {
    setClient(null);
    setWalletAddress(null);
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
