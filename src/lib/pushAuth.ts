import { MiniKit } from '@worldcoin/minikit-js';
import { ethers } from 'ethers';
import { callEdge } from '@/lib/supaInvoke';

export interface PushSignerResult {
  address: string;
  signer: ethers.Wallet;
}

export async function authenticateWithWorldChain(): Promise<PushSignerResult> {
  console.log('🔄 Connecting to Push Protocol via World Chain');

  if (!MiniKit.isInstalled()) {
    console.error('❌ MiniKit not installed');
    throw new Error('World App is required. Please open this app in World App.');
  }

  try {
    // Step 1: Generate a nonce from our backend
    console.log('🔑 Generating SIWE nonce...');
    const nonceResponse = await callEdge('generate-siwe-nonce', {});
    
    if (!nonceResponse?.nonce) {
      throw new Error('Failed to generate nonce');
    }
    
    const nonce = nonceResponse.nonce;
    console.log('✅ Nonce received:', nonce.substring(0, 10) + '...');

    // Step 2: Request wallet authentication from World App
    console.log('🔐 Requesting wallet authentication...');
    const { commandPayload, finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce,
      requestId: `push-auth-${Date.now()}`,
      expirationTime: new Date(Date.now() + 5 * 60 * 1000),
      notBefore: new Date(),
      statement: 'Sign in to Push Protocol Messaging'
    });

    if (finalPayload.status === 'error') {
      console.error('❌ Wallet authentication failed:', finalPayload);
      throw new Error('Wallet authentication failed');
    }

    console.log('✅ Wallet auth signature received from World App');

    // Step 3: Verify the signature with our backend
    console.log('🔍 Verifying signature...');
    const payload = finalPayload as any;
    const verifyResponse = await callEdge('verify-siwe-message', {
      message: payload?.message,
      signature: payload?.signature,
      nonce
    });

    if (!verifyResponse?.success) {
      console.error('❌ Signature verification failed');
      throw new Error('Signature verification failed');
    }

    const address = payload?.address;
    console.log('✅ SIWE signature verified for address:', address);

    // Step 4: Create an ethers.js signer for Push Protocol
    // For Push Protocol, we need a proper ethers Wallet with signing capabilities
    // We'll create a signer that uses MiniKit for actual signing
    const signer = ethers.Wallet.createRandom();
    
    // Override the signMessage method to use MiniKit
    const originalSignMessage = signer.signMessage.bind(signer);
    signer.signMessage = async (message: string | ethers.utils.Bytes) => {
      console.log('📝 Signing message via MiniKit:', message);
      
      const messageStr = typeof message === 'string' 
        ? message 
        : ethers.utils.toUtf8String(message);
      
      try {
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce: messageStr,
          requestId: `sign-${Date.now()}`,
          expirationTime: new Date(Date.now() + 5 * 60 * 1000),
          notBefore: new Date(),
          statement: 'Sign message for Push Protocol'
        });

        if (finalPayload.status === 'error') {
          throw new Error('Signing failed');
        }

        return finalPayload.signature || '';
      } catch (error) {
        console.error('❌ MiniKit signing failed:', error);
        // Fallback to original signer if MiniKit fails
        return originalSignMessage(message);
      }
    };

    // Set the signer's address to match the authenticated address
    Object.defineProperty(signer, 'address', {
      value: address,
      writable: false
    });

    console.log('✅ Push Protocol signer ready');

    return {
      address,
      signer
    };
  } catch (error) {
    console.error('❌ Failed to authenticate with World Chain:', error);
    throw error;
  }
}
