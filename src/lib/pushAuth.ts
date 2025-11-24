import { MiniKit } from '@worldcoin/minikit-js';
import { callEdge } from '@/lib/supaInvoke';

export interface PushSignerResult {
  address: string;
  signer: any;
}

/**
 * Creates an ethers-compatible signer for Push Protocol
 * Uses World Chain authentication via MiniKit
 */
function createEthersSigner(address: string) {
  return {
    // Required by Push Protocol - ethers.js interface
    async getAddress(): Promise<string> {
      return address;
    },

    // Sign messages using MiniKit
    async signMessage(message: string | Uint8Array): Promise<string> {
      const messageStr = typeof message === 'string' 
        ? message 
        : new TextDecoder().decode(message);
      
      console.log('📝 Signing message via MiniKit:', messageStr.substring(0, 50) + '...');
      
      try {
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce: messageStr,
          requestId: `sign-msg-${Date.now()}`,
          expirationTime: new Date(Date.now() + 5 * 60 * 1000),
          notBefore: new Date(),
          statement: 'Sign message for Push Protocol'
        });

        if (finalPayload.status === 'error') {
          throw new Error('Signing failed: ' + (finalPayload as any).errorMessage);
        }

        const signature = (finalPayload as any).signature;
        if (!signature) {
          throw new Error('No signature returned from World App');
        }

        console.log('✅ Message signed successfully');
        return signature;
      } catch (error) {
        console.error('❌ MiniKit signing failed:', error);
        throw error;
      }
    },

    // Optional: Sign typed data (if needed by Push Protocol)
    async _signTypedData(domain: any, types: any, value: any): Promise<string> {
      console.log('📝 Signing typed data via MiniKit');
      
      try {
        const dataToSign = JSON.stringify({
          domain,
          types,
          value
        });

        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce: dataToSign,
          requestId: `sign-typed-${Date.now()}`,
          expirationTime: new Date(Date.now() + 5 * 60 * 1000),
          notBefore: new Date(),
          statement: 'Sign typed data for Push Protocol'
        });

        if (finalPayload.status === 'error') {
          throw new Error('Signing failed: ' + (finalPayload as any).errorMessage);
        }

        const signature = (finalPayload as any).signature;
        if (!signature) {
          throw new Error('No signature returned from World App');
        }

        console.log('✅ Typed data signed successfully');
        return signature;
      } catch (error) {
        console.error('❌ MiniKit typed data signing failed:', error);
        throw error;
      }
    }
  };
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
    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
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
    if (!address) {
      throw new Error('No address returned from authentication');
    }

    console.log('✅ SIWE signature verified for address:', address);

    // Step 4: Create ethers-compatible signer for Push Protocol
    const signer = createEthersSigner(address);
    console.log('✅ Push Protocol signer ready');

    return {
      address: address.toLowerCase(),
      signer
    };
  } catch (error) {
    console.error('❌ Failed to authenticate with World Chain:', error);
    throw error;
  }
}
