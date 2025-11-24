import { useState, useCallback } from 'react';
import { Client } from '@xmtp/browser-sdk';
import { toast } from 'sonner';

export const useXmtpClient = () => {
  const [client, setClient] = useState<Client | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const initializeClient = useCallback(async (signer: any) => {
    if (client || isInitializing) return client;

    setIsInitializing(true);
    try {
      console.log('🔄 Initializing XMTP client');
      
      // Create XMTP client with wallet signer
      const newClient = await Client.create(signer, {
        env: 'production'
      });
      
      console.log('✅ XMTP client initialized');
      setClient(newClient);
      toast.success('Connected to XMTP messaging');
      return newClient;
    } catch (error) {
      console.error('❌ Failed to initialize XMTP client:', error);
      toast.error('Failed to connect to XMTP messaging');
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, [client, isInitializing]);

  const disconnectClient = useCallback(() => {
    setClient(null);
    toast.info('Disconnected from XMTP');
  }, []);

  return {
    client,
    isInitializing,
    initializeClient,
    disconnectClient
  };
};
