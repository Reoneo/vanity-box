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
      
      // Check if we have stored encryption key to reuse existing installation
      const storageKey = `xmtp-keys-${address.toLowerCase()}`;
      const storedKeys = localStorage.getItem(storageKey);
      
      let newClient: Client;
      
      if (storedKeys) {
        console.log('♻️ Reusing existing XMTP installation');
        try {
          const keys = JSON.parse(storedKeys);
          newClient = await Client.create(signer, {
            env: 'production',
            ...keys
          });
        } catch (reuseError) {
          console.warn('⚠️ Failed to reuse keys, creating new installation:', reuseError);
          localStorage.removeItem(storageKey);
          newClient = await Client.create(signer, {
            env: 'production'
          });
        }
      } else {
        newClient = await Client.create(signer, {
          env: 'production'
        });
        
        // Store the keys for future reuse
        try {
          const keys = {
            dbEncryptionKey: (newClient as any).dbEncryptionKey,
          };
          localStorage.setItem(storageKey, JSON.stringify(keys));
          console.log('💾 Stored XMTP keys for reuse');
        } catch (storageError) {
          console.warn('⚠️ Could not store keys:', storageError);
        }
      }
      
      console.log('✅ XMTP client initialized');
      setClient(newClient);
      setWalletAddress(address);
      toast.success('Connected to XMTP messaging');
    } catch (error: any) {
      console.error('❌ Failed to initialize XMTP client:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already registered') || error.message?.includes('10/10 installations')) {
        toast.error('XMTP installation limit reached. Please clear browser data or use a different wallet.');
        // Clear stored keys to allow fresh start
        const storageKey = `xmtp-keys-${address.toLowerCase()}`;
        localStorage.removeItem(storageKey);
      } else {
        toast.error('Failed to connect to XMTP messaging');
      }
      
      throw error;
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
