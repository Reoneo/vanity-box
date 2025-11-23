import { useEffect, useState } from 'react';
import { Client } from '@xmtp/browser-sdk';
import { MiniKit } from '@worldcoin/minikit-js';
import { createWorldXmtpSigner } from '@/lib/xmtpWorldSigner';

export function useWorldXmtpClient() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // only run inside World App
    if (!MiniKit.isInstalled()) return;

    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Wallet auth – get wallet address + username from World App
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce: crypto.randomUUID().replace(/-/g, ''), // or fetch from your backend
          statement: 'Sign in to Vanity.box messages',
        });

        if (!finalPayload || finalPayload.status !== 'success') {
          throw new Error('Wallet auth failed');
        }

        const address = finalPayload.address;
        if (!address) {
          throw new Error('No wallet address returned from walletAuth');
        }

        // 2. Build XMTP signer using World App signMessage
        const signer = createWorldXmtpSigner(address);

        // 3. Create XMTP client
        const xmtpClient = await Client.create(signer, {
          env: 'production', // production XMTP network
        });

        if (!cancelled) {
          setClient(xmtpClient);
          setWalletAddress(address);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('XMTP init error', err);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return { client, loading, error, walletAddress };
}
