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
      // Show initial toast
      toast.loading('Step 1 of 2: Authenticating with World Chain...', { id: 'push-init' });
      
      // Authenticate with World Chain and get signer
      const { address, signer } = await authenticateWithWorldChain();
      console.log('✅ Authentication successful:', address);

      // Update toast for step 2
      toast.loading('Step 2 of 2: Setting up encrypted messaging...', { id: 'push-init' });
      
      // Test the signer before Push initialization
      console.log('🧪 Testing signer with sample message...');
      const { ethers } = await import('ethers');
      const testMessage = 'Push Protocol Signer Test';
      
      try {
        const testSig = await signer.signMessage(testMessage);
        console.log('✅ Test signature received:', {
          length: testSig.length,
          valid: testSig.length === 132,
          prefix: testSig.substring(0, 4)
        });

        // Verify the signature can be recovered
        const recoveredAddress = ethers.utils.verifyMessage(testMessage, testSig);
        const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
        
        console.log('✅ Signature verification:', {
          expected: address.toLowerCase(),
          recovered: recoveredAddress.toLowerCase(),
          matches: isValid
        });

        if (!isValid) {
          throw new Error('Signature verification failed - address mismatch');
        }
      } catch (testError) {
        console.error('❌ Signer test failed:', testError);
        throw new Error('Signer validation failed: ' + (testError as Error).message);
      }
      
      // Initialize Push Protocol user
      console.log('🔄 Creating Push Protocol user (encryption setup)...');
      
      const user = await PushAPI.initialize(signer as any, {
        env: CONSTANTS.ENV.PROD,
        account: address,
        progressHook: (progress: any) => {
          console.log('📊 Push initialization progress:', progress);
        }
      });

      console.log('✅ Push Protocol user initialized successfully');
      console.log('   Address:', address);
      console.log('   User account:', (user as any).account || address);
      
      setPushUser(user);
      setWalletAddress(address);
      setIsConnected(true);
      
      toast.success('✅ Connected to Push Protocol', { id: 'push-init' });
    } catch (error: any) {
      console.error('❌ Failed to initialize Push Protocol:', {
        message: error?.message || 'Unknown error',
        details: error?.info || error?.data || 'No additional details',
        stack: error?.stack
      });
      
      // Check for specific error types
      if (error?.message?.includes('read-only')) {
        console.error('⚠️ Read-only mode error detected - signer validation may have failed');
        toast.error('Connection failed: Read-only mode. Please try again.', { id: 'push-init' });
      } else {
        toast.error(error?.message || 'Failed to connect to Push Protocol', { id: 'push-init' });
      }
      
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
