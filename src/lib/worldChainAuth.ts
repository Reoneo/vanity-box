import { MiniKit, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import { ethers } from 'ethers';
import { callEdge } from '@/lib/supaInvoke';

export interface WorldChainSigner {
  address: string;
  signer: ethers.Signer;
}

/**
 * Authenticate with World Chain wallet and get ethers.js signer for XMTP
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

  // Step 4: Create ethers.js signer for XMTP
  const provider = new ethers.providers.JsonRpcProvider('https://worldchain-mainnet.g.alchemy.com/public');
  
  // Create a custom signer that uses MiniKit for signing
  const signer = {
    getAddress: async () => address,
    signMessage: async (message: string) => {
      // Use MiniKit to sign messages
      const signResult = await MiniKit.commandsAsync.walletAuth({
        nonce: message,
        requestId: `sign-${Date.now()}`,
        expirationTime: new Date(Date.now() + 5 * 60 * 1000),
        notBefore: new Date(),
        statement: 'Sign message for XMTP'
      });

      if (signResult.finalPayload.status === 'error') {
        throw new Error('Message signing failed');
      }

      const signSuccessPayload = signResult.finalPayload as MiniAppWalletAuthSuccessPayload;
      return signSuccessPayload.signature;
    },
    connect: (provider: any) => signer,
    provider
  } as unknown as ethers.Signer;

  return { address, signer };
}
