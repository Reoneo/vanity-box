import { useEffect, useState, useRef } from 'react';
import { Client } from '@xmtp/browser-sdk';
import { MiniKit } from '@worldcoin/minikit-js';
import { createWorldXmtpSigner } from '@/lib/xmtpWorldSigner';

/**
 * Generate or retrieve a persistent encryption key for XMTP client.
 * This ensures XMTP can locate and reuse existing installations in IndexedDB,
 * preventing the 10/10 installation limit error.
 */
function getOrCreateEncryptionKey(walletAddress: string): Uint8Array {
  const storageKey = `xmtp:encryptionKey:${walletAddress.toLowerCase()}`;
  
  // Try to retrieve existing key
  const existingKey = localStorage.getItem(storageKey);
  if (existingKey) {
    try {
      const parsed = JSON.parse(existingKey);
      return new Uint8Array(parsed);
    } catch (e) {
      console.warn('[XMTP] Failed to parse encryption key, generating new one');
      localStorage.removeItem(storageKey);
    }
  }
  
  // Generate new 32-byte key
  const newKey = new Uint8Array(32);
  crypto.getRandomValues(newKey);
  
  // Store for future use
  localStorage.setItem(storageKey, JSON.stringify(Array.from(newKey)));
  console.log('[XMTP] Generated new encryption key for', walletAddress);
  
  return newKey;
}

/**
 * Reset XMTP installation for the current wallet.
 * Call this to recover from installation limit errors.
 */
export function resetXmtpInstallation(walletAddress: string) {
  const storageKey = `xmtp:encryptionKey:${walletAddress.toLowerCase()}`;
  localStorage.removeItem(storageKey);
  console.log('[XMTP] Cleared encryption key for', walletAddress);
}

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

        // 2. Get or create persistent encryption key
        // This key is used as an identifier to locate existing XMTP installations in IndexedDB
        // Using the same key prevents creating new installations on page refresh
        const dbEncryptionKey = getOrCreateEncryptionKey(address);
        console.log('[XMTP] Using encryption key for wallet:', address);

        // 3. Build XMTP signer using World App signMessage
        const signer = createWorldXmtpSigner(address);

        // 4. Create or restore XMTP client
        // With dbEncryptionKey, XMTP will reuse existing installation from IndexedDB
        // This prevents hitting the 10/10 installation limit
        const xmtpClient = await Client.create(signer, {
          env: 'production',
          appVersion: 'vanity-box/world-miniapp/1.0.0',
          dbEncryptionKey, // Critical: enables installation persistence
        });
        
        console.log('[XMTP] Client created/restored successfully');

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
