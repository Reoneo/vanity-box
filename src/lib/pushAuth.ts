import { MiniKit } from '@worldcoin/minikit-js';
import { callEdge } from '@/lib/supaInvoke';
import { ethers } from 'ethers';

export interface PushSignerResult {
  address: string;
  signer: ethers.Signer;
}

/**
 * MiniKitSigner - Clean ethers.Signer implementation for Push Protocol
 * ❌ Does NOT touch _isSigner property - ethers.Signer handles that
 * ✅ Uses MiniKit signMessage and signTypedData commands
 */
class MiniKitSigner extends ethers.Signer {
  private walletAddress: string;
  // Don't redeclare provider - ethers.Signer already has it

  constructor(address: string, provider?: ethers.providers.Provider) {
    super();
    this.walletAddress = address.toLowerCase();
    if (provider) {
      Object.defineProperty(this, 'provider', { value: provider, writable: false });
    }
    // ❌ NO Object.defineProperty here
    // ❌ NO _isSigner property declaration
  }

  async getAddress(): Promise<string> {
    return this.walletAddress;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!MiniKit.isInstalled()) {
      throw new Error('MiniKit is not installed – open this in World App.');
    }

    const messageStr = typeof message === 'string' 
      ? message 
      : ethers.utils.hexlify(message);
    
    console.log('📝 Signing message via MiniKit (Step 2 of 2: Encryption Setup)');
    console.log('   Message preview:', messageStr.substring(0, 50) + '...');
    
    try {
      const { finalPayload } = await MiniKit.commandsAsync.signMessage({
        message: messageStr
      });

      if (finalPayload.status !== 'success') {
        console.error('MiniKit signMessage failed', finalPayload);
        throw new Error('MiniKit signMessage failed');
      }

      console.log('✅ Message signed successfully');
      return finalPayload.signature;
    } catch (error) {
      console.error('❌ MiniKit signing failed:', error);
      throw error;
    }
  }

  async signTransaction(transaction: ethers.providers.TransactionRequest): Promise<string> {
    throw new Error('Transaction signing not supported in World App Mini App');
  }

  connect(provider: ethers.providers.Provider): ethers.Signer {
    return new MiniKitSigner(this.walletAddress, provider);
  }

  async _signTypedData(
    domain: any,
    types: Record<string, Array<any>>,
    value: Record<string, any>
  ): Promise<string> {
    if (!MiniKit.isInstalled()) {
      throw new Error('MiniKit is not installed – open this in World App.');
    }

    console.log('📝 Signing typed data via MiniKit');
    
    try {
      // Prepare clean types for MiniKit
      const cleanTypes: any = { ...types };
      if (!cleanTypes.EIP712Domain) {
        const eipDomain: { name: string; type: string }[] = [];
        if (domain.chainId) {
          eipDomain.push({ name: 'chainId', type: 'uint256' });
        }
        if (domain.verifyingContract) {
          eipDomain.push({ name: 'verifyingContract', type: 'address' });
        }
        cleanTypes.EIP712Domain = eipDomain;
      }

      const primaryType = Object.keys(cleanTypes).find((k) => k !== 'EIP712Domain') || Object.keys(cleanTypes)[0];

      const { finalPayload } = await MiniKit.commandsAsync.signTypedData({
        domain: domain as any,
        types: cleanTypes,
        primaryType,
        message: value
      });

      if (finalPayload.status !== 'success') {
        console.error('MiniKit signTypedData failed', finalPayload);
        throw new Error('MiniKit signTypedData failed');
      }

      console.log('✅ Typed data signed successfully');
      return finalPayload.signature;
    } catch (error) {
      console.error('❌ MiniKit typed data signing failed:', error);
      throw error;
    }
  }
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

    // Step 2: Request wallet authentication from World App (Step 1 of 2)
    console.log('🔐 Requesting wallet authentication (Step 1 of 2: Authentication)...');
    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce,
      requestId: 'push-chat',
      expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notBefore: new Date(Date.now() - 5 * 60 * 1000),
      statement: 'Sign in to Vanity.box messaging (Step 1 of 2: World Chain authentication)'
    });

    if (finalPayload.status === 'error') {
      console.error('❌ Wallet authentication failed:', finalPayload);
      throw new Error('Wallet authentication failed');
    }

    const address = finalPayload.address;
    if (!address) {
      throw new Error('No address returned from authentication');
    }

    console.log('✅ WalletAuth success, address:', address);

    // Step 3: Create MiniKitSigner (no provider needed for Push Protocol)
    const signer = new MiniKitSigner(address);
    
    // Log signer validation (read-only, don't modify _isSigner)
    console.log('🔍 MiniKitSigner ready:', {
      address: await signer.getAddress(),
      hasSignMessage: typeof signer.signMessage === 'function',
      hasSignTypedData: typeof signer._signTypedData === 'function'
    });
    
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
