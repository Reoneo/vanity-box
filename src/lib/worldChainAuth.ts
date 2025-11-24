import { MiniKit, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import { toBytes } from 'viem';
import { callEdge } from '@/lib/supaInvoke';

// XMTP Signer types
type Identifier = {
  identifier: string;
  identifierKind: 'Ethereum';
};

type Signer = {
  type: 'EOA' | 'SCW';
  getIdentifier: () => Identifier;
  signMessage: (message: string) => Promise<Uint8Array>;
  getChainId?: () => bigint;
};

export interface WorldChainSigner {
  address: string;
  signer: Signer;
}

/**
 * Authenticate with World Chain wallet and get XMTP-compatible signer
 */
export async function authenticateWithWorldChain(): Promise<WorldChainSigner> {
  console.log('🌍 Starting World Chain authentication for XMTP');

  // Step 1: Generate nonce from backend
  const { nonce } = await callEdge<{ nonce: string }>('generate-siwe-nonce');
  console.log('✅ Nonce generated');

  // Step 2: Request wallet auth from MiniKit
  const walletAuthResult = await MiniKit.commandsAsync.walletAuth({
    nonce,
    requestId: `xmtp-${Date.now()}`,
    expirationTime: new Date(Date.now() + 5 * 60 * 1000),
    notBefore: new Date(),
    statement: 'Sign in with Ethereum to access XMTP messaging'
  });

  if (walletAuthResult.finalPayload.status === 'error') {
    throw new Error('Wallet authentication failed');
  }

  const successPayload = walletAuthResult.finalPayload as MiniAppWalletAuthSuccessPayload;
  const { address, message, signature } = successPayload;
  
  console.log('✅ Wallet auth signature received', { address });

  // Step 3: Verify signature on backend
  const verifyResult = await callEdge<{ success: boolean; address: string }>('verify-siwe-message', {
    message,
    signature,
    nonce
  });

  if (!verifyResult.success) {
    throw new Error('Signature verification failed');
  }

  console.log('✅ Signature verified');

  // Step 4: Create XMTP-compatible signer
  const signer: Signer = {
    type: 'EOA',
    getIdentifier: (): Identifier => ({
      identifier: address.toLowerCase(),
      identifierKind: 'Ethereum'
    }),
    signMessage: async (message: string): Promise<Uint8Array> => {
      console.log('📝 Signing message for XMTP');
      // Use MiniKit to sign messages
      const signResult = await MiniKit.commandsAsync.signMessage({
        message
      });

      if (signResult.finalPayload.status === 'error') {
        throw new Error('Message signing failed');
      }

      const hexSignature = signResult.finalPayload.signature;
      console.log('✅ Message signed');
      
      // Convert hex signature to Uint8Array for XMTP
      return toBytes(hexSignature as `0x${string}`);
    }
  };

  return { address, signer };
}
