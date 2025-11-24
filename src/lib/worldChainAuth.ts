// src/lib/worldChainAuth.ts
import {
  MiniKit,
  type MiniAppWalletAuthSuccessPayload,
} from '@worldcoin/minikit-js';
import { toBytes } from 'viem';
import { callEdge } from '@/lib/supaInvoke';
import type { Signer, Identifier } from '@xmtp/browser-sdk';

export interface WorldChainSignerResult {
  address: string;
  signer: Signer;
}

/**
 * Authenticate the user in World App (World Chain)
 * and return an XMTP-compatible Signer + address.
 */
export async function authenticateWithWorldChain(): Promise<WorldChainSignerResult> {
  console.log('🌍 Starting World Chain authentication for XMTP');

  // 1. Get nonce from your backend (SIWE flow)
  const { nonce } = await callEdge<{ nonce: string }>('generate-siwe-nonce');
  console.log('✅ Nonce generated:', nonce);

  // 2. Ask World App wallet to authenticate
  const walletAuthResult = await MiniKit.commandsAsync.walletAuth({
    nonce,
    requestId: `xmtp-${Date.now()}`,
    expirationTime: new Date(Date.now() + 5 * 60 * 1000),
    notBefore: new Date(),
    statement: 'Sign in with Ethereum to access XMTP messaging',
  });

  if (walletAuthResult.finalPayload.status === 'error') {
    throw new Error('Wallet authentication failed');
  }

  const successPayload = walletAuthResult.finalPayload as MiniAppWalletAuthSuccessPayload;
  const { address, message, signature } = successPayload;

  console.log('✅ Wallet auth signature received from World App:', { address });

  // 3. Verify the SIWE message with your backend
  const verifyResult = await callEdge<{ success: boolean; address: string }>(
    'verify-siwe-message',
    { message, signature, nonce },
  );

  if (!verifyResult.success) {
    throw new Error('Signature verification failed');
  }

  console.log('✅ SIWE signature verified for:', verifyResult.address);

  // 4. Build XMTP Signer
  const signer: Signer = {
    type: 'EOA',
    getIdentifier: (): Identifier => ({
      identifier: address.toLowerCase(),
      identifierKind: 'Ethereum',
    }),
    signMessage: async (data: string): Promise<Uint8Array> => {
      console.log('📝 XMTP signer: signing message via MiniKit');

      const signResult = await MiniKit.commandsAsync.signMessage({ message: data });

      if (signResult.finalPayload.status === 'error') {
        throw new Error('Message signing failed');
      }

      const hexSignature = signResult.finalPayload.signature as `0x${string}`;
      const bytes = toBytes(hexSignature);

      console.log('✅ XMTP signer: message signed');
      return bytes;
    },
  };

  return { address, signer };
}
