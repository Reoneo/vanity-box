import { useEffect, useState, useRef } from 'react';
import { Client } from '@xmtp/xmtp-js';
import { MiniKit } from '@worldcoin/minikit-js';
import { Wallet } from 'ethers';

const ENCRYPTION_KEY_PREFIX = 'xmtp_encrypted_key_';
const XMTP_ENV = 'production';

/**
 * Securely store and retrieve XMTP keys from local storage
 */
class XmtpKeyStore {
  static async getOrCreateKey(walletAddress: string): Promise<Uint8Array> {
    const storageKey = `${ENCRYPTION_KEY_PREFIX}${walletAddress.toLowerCase()}`;
    
    try {
      // Try to retrieve existing key
      const existingKey = localStorage.getItem(storageKey);
      if (existingKey) {
        const keyArray = JSON.parse(existingKey);
        console.log('[XMTP] Retrieved existing key for', walletAddress);
        return new Uint8Array(keyArray);
      }
    } catch (e) {
      console.warn('[XMTP] Failed to retrieve key, generating new one');
    }
    
    // Generate new key
    const newKey = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(storageKey, JSON.stringify(Array.from(newKey)));
    console.log('[XMTP] Generated and stored new key for', walletAddress);
    
    return newKey;
  }
  
  static clearKey(walletAddress: string): void {
    const storageKey = `${ENCRYPTION_KEY_PREFIX}${walletAddress.toLowerCase()}`;
    localStorage.removeItem(storageKey);
    console.log('[XMTP] Cleared key for', walletAddress);
  }
}

/**
 * Create a World App wallet signer for XMTP
 */
class WorldAppSigner extends Wallet {
  private worldAppAddress: string;
  
  constructor(address: string) {
    // Create a random private key for the Wallet base class
    // We'll override the signing method to use World App
    super(Wallet.createRandom().privateKey);
    this.worldAppAddress = address.toLowerCase();
  }
  
  override async getAddress(): Promise<string> {
    return this.worldAppAddress;
  }
  
  override async signMessage(message: string | Uint8Array): Promise<string> {
    const messageStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
    
    const { finalPayload } = await MiniKit.commandsAsync.signMessage({
      message: messageStr,
    });
    
    if (!finalPayload || finalPayload.status !== 'success') {
      throw new Error('World App signature request failed or was cancelled');
    }
    
    return finalPayload.signature;
  }
}

export function resetXmtpInstallation(walletAddress: string) {
  XmtpKeyStore.clearKey(walletAddress);
}

export function useWorldXmtpClient() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Only run inside World App
    if (!MiniKit.isInstalled()) return;
    
    // Prevent re-initialization
    if (initialized.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[XMTP] Starting initialization...');

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

        console.log('[XMTP] Authenticated with wallet:', address);

        // 2. Get or create encryption key from local storage
        const encryptionKey = await XmtpKeyStore.getOrCreateKey(address);
        
        // 3. Create World App signer
        const signer = new WorldAppSigner(address);

        // 4. Create XMTP client with persistent key storage
        console.log('[XMTP] Creating client...');
        const xmtpClient = await Client.create(signer, {
          env: XMTP_ENV,
        });
        
        console.log('[XMTP] Client created successfully');

        if (!cancelled) {
          setClient(xmtpClient);
          setWalletAddress(address);
          initialized.current = true;
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[XMTP] Initialization error:', err);
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return { client, loading, error, walletAddress };
}
