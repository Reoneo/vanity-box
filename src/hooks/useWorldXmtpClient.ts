import { useEffect, useState, useCallback } from 'react';
import { Client } from '@xmtp/react-sdk';
import { MiniKit } from '@worldcoin/minikit-js';

const XMTP_ENV = 'production';

/**
 * Create a World App signer for XMTP V3
 */
const createWorldAppSigner = (address: string) => ({
  getAddress: async () => address.toLowerCase(),
  signMessage: async (message: string) => {
    const { finalPayload } = await MiniKit.commandsAsync.signMessage({
      message,
    });
    
    if (!finalPayload || finalPayload.status !== 'success') {
      throw new Error('World App signature request failed or was cancelled');
    }
    
    return finalPayload.signature;
  },
});

export function useWorldXmtpClient() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    // Only run inside World App
    if (!MiniKit.isInstalled()) {
      setError(new Error('World App not installed'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[XMTP V3] Starting initialization...');

      // 1. Get wallet address from World App
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: crypto.randomUUID().replace(/-/g, ''),
        statement: 'Sign in to Vanity.box messaging',
      });

      if (!finalPayload || finalPayload.status !== 'success') {
        throw new Error('Wallet authentication failed');
      }

      const address = finalPayload.address;
      if (!address) {
        throw new Error('No wallet address returned');
      }

      console.log('[XMTP V3] Authenticated with wallet:', address);

      // 2. Create World App signer
      const signer = createWorldAppSigner(address);

      // 3. Create XMTP V3 client
      console.log('[XMTP V3] Creating client...');
      const xmtpClient = await Client.create(signer, {
        env: XMTP_ENV,
      });
      
      console.log('[XMTP V3] Client created successfully');

      setClient(xmtpClient);
      setWalletAddress(address);
    } catch (err: any) {
      console.error('[XMTP V3] Initialization error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setClient(null);
    setWalletAddress(null);
    setError(null);
  }, []);

  return { client, loading, error, walletAddress, initialize, reset };
}
