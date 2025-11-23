import { useEffect, useState, useRef } from 'react';
import { Client } from '@xmtp/browser-sdk';
import { MiniKit } from '@worldcoin/minikit-js';
import { createWorldXmtpSigner } from '@/lib/xmtpWorldSigner';

export function useWorldXmtpClient() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // only run inside World App
    if (!MiniKit.isInstalled()) return;
    
    // Prevent re-initialization if already done
    if (initialized.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Wallet auth – get wallet address from World App
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce: crypto.randomUUID().replace(/-/g, ''),
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

        // 3. Create or restore XMTP client
        // XMTP Browser SDK automatically stores encryption keys in IndexedDB
        // This will reuse existing keys if they exist, or create new ones only if needed
        const xmtpClient = await Client.create(signer, {
          env: 'production',
          appVersion: 'vanity-box/world-miniapp/1.0.0',
        });

        if (!cancelled) {
          setClient(xmtpClient);
          setWalletAddress(address);
          initialized.current = true;
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
