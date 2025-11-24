// src/contexts/XmtpContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Client, type Signer } from '@xmtp/browser-sdk';
import { toast } from 'sonner';

interface XmtpContextType {
  client: Client | null;
  isInitializing: boolean;
  isConnected: boolean;
  walletAddress: string | null;
  initializeClient: (signer: Signer, address: string) => Promise<void>;
  disconnectClient: () => void;
}

const XmtpContext = createContext<XmtpContextType | undefined>(undefined);

export const XmtpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const initializeClient = useCallback(
    async (signer: Signer, address: string) => {
      if (client || isInitializing) {
        console.log('⚠️ XMTP client already exists or is initializing, skipping');
        return;
      }

      setIsInitializing(true);

      try {
        console.log('🔄 Creating XMTP client for:', address);

        const newClient = await Client.create(signer, {
          env: 'production', // XMTP mainnet
          // you can optionally add: loggingLevel: 'debug'
        });

        console.log('✅ XMTP client ready. Inbox ID:', newClient.inboxId);
        setClient(newClient);
        setWalletAddress(address.toLowerCase());
      } catch (error: any) {
        console.error('❌ Failed to initialize XMTP client:', error);
        setClient(null);
        setWalletAddress(null);

        let errorMsg = 'Failed to connect to XMTP';
        if (error?.message?.includes('installation')) {
          errorMsg = 'XMTP installation limit reached. Clear site data and try again.';
        } else if (error?.message) {
          errorMsg += `: ${error.message}`;
        }

        toast.error(errorMsg);
        throw error;
      } finally {
        setIsInitializing(false);
      }
    },
    [client, isInitializing],
  );

  const disconnectClient = useCallback(() => {
    console.log('🔌 Disconnecting XMTP client');
    setClient(null);
    setWalletAddress(null);
  }, []);

  const value: XmtpContextType = {
    client,
    isInitializing,
    isConnected: !!client && !!walletAddress,
    walletAddress,
    initializeClient,
    disconnectClient,
  };

  return <XmtpContext.Provider value={value}>{children}</XmtpContext.Provider>;
};

export const useXmtp = () => {
  const ctx = useContext(XmtpContext);
  if (!ctx) {
    throw new Error('useXmtp must be used within XmtpProvider');
  }
  return ctx;
};
