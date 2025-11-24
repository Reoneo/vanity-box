import {
  MiniKit,
  WalletAuthInput,
  SignMessageInput,
  SignTypedDataInput,
} from '@worldcoin/minikit-js';
import { ethers, BigNumber } from 'ethers';

const WORLDCHAIN_RPC = 'https://worldchain-mainnet.g.alchemy.com/public';

export interface PushSignerResult {
  address: string;
  signer: ethers.Signer;
}

// ---- helper: JSON-ify typed data (convert BigNumber -> string, etc.) ----
const normalizeForJson = (value: any): any => {
  if (BigNumber.isBigNumber(value)) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeForJson);
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeForJson(v);
    }
    return out;
  }
  return value;
};

// ---- MiniKit-based ethers.Signer implementation ----

export class MiniKitSigner extends ethers.Signer {
  private walletAddress: string;

  constructor(address: string, provider?: ethers.providers.Provider) {
    super();
    this.walletAddress = address.toLowerCase();
    if (provider) {
      Object.defineProperty(this, 'provider', { value: provider, writable: false });
    }
    // IMPORTANT: don't touch _isSigner at all – ethers defines it.
  }

  async getAddress(): Promise<string> {
    return this.walletAddress;
  }

  /**
   * EIP-191 signing via MiniKit.signMessage
   */
  async signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    if (!MiniKit.isInstalled()) {
      throw new Error('MiniKit is not installed – open this in World App.');
    }

    // Push generally passes a string; if it passes bytes, we keep the bytes
    // semantics by hexlify-ing them.
    const msg: string =
      typeof message === 'string'
        ? message
        : ethers.utils.hexlify(message);

    console.log('🖊 MiniKitSigner.signMessage called (Step 2 of 2: Encryption Setup)');

    const signMessagePayload: SignMessageInput = { message: msg };

    const { finalPayload } =
      await MiniKit.commandsAsync.signMessage(signMessagePayload);

    if (finalPayload.status !== 'success') {
      console.error('MiniKit signMessage error:', finalPayload);
      throw new Error('MiniKit signMessage failed');
    }

    console.log('✅ Message signed successfully');
    return finalPayload.signature;
  }

  async signTransaction(transaction: ethers.providers.TransactionRequest): Promise<string> {
    throw new Error('Transaction signing not supported in World App Mini App');
  }

  /**
   * EIP-712 typed data signing via MiniKit.signTypedData
   */
  async _signTypedData(
    domain: any,
    types: Record<
      string,
      Array<any>
    >,
    value: Record<string, any>,
  ): Promise<string> {
    if (!MiniKit.isInstalled()) {
      throw new Error('MiniKit is not installed – open this in World App.');
    }

    console.log('🖊 MiniKitSigner._signTypedData called');

    // MiniKit requires pure JSON (no BigNumber, no functions, etc.)
    const normalizedDomain = domain
      ? (normalizeForJson(domain) as any)
      : undefined;
    const normalizedMessage = normalizeForJson(value);
    const jsonTypes = types as any; // structure already matches TypedData

    // Derive primaryType the same way most wallets do
    const primaryType =
      Object.keys(jsonTypes).find((k) => k !== 'EIP712Domain') ||
      Object.keys(jsonTypes)[0];

    const payload: SignTypedDataInput = {
      types: jsonTypes,
      primaryType,
      message: normalizedMessage,
      domain: normalizedDomain,
    };

    const { finalPayload } =
      await MiniKit.commandsAsync.signTypedData(payload);

    if (finalPayload.status !== 'success') {
      console.error('MiniKit signTypedData error:', finalPayload);
      throw new Error('MiniKit signTypedData failed');
    }

    console.log('✅ Typed data signed successfully');
    return finalPayload.signature;
  }

  connect(provider: ethers.providers.Provider): ethers.Signer {
    return new MiniKitSigner(this.walletAddress, provider);
  }
}

// ---- World App auth -> signer ----

export async function authenticateWithWorldChain(): Promise<PushSignerResult> {
  if (!MiniKit.isInstalled()) {
    throw new Error('MiniKit not installed – open this mini app in World App.');
  }

  console.log('🔐 Starting WalletAuth (Push step 1 of 2 – authentication)...');

  // Generate nonce from backend on the SAME origin
  let nonce: string;

  try {
    const res = await fetch('/functions/v1/generate-siwe-nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      console.error('Nonce endpoint returned non-200', res.status, res.statusText);
      throw new Error('Failed to generate nonce from server');
    }

    const data = await res.json();
    if (!data?.nonce) {
      console.error('Nonce response missing nonce field', data);
      throw new Error('Nonce response invalid');
    }

    nonce = data.nonce;
    console.log('✅ Nonce received:', nonce.substring(0, 10) + '...');
  } catch (e) {
    console.error('❌ Error fetching nonce:', e);
    throw new Error('Unable to contact Vanity.box server. Please try again.');
  }

  const walletAuthInput: WalletAuthInput = {
    nonce,
    requestId: 'push-chat',
    expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notBefore: new Date(Date.now() - 5 * 60 * 1000),
    statement: 'Sign in to Vanity.box messaging (Step 1 of 2: Worldchain authentication).',
  };

  const { finalPayload } =
    await MiniKit.commandsAsync.walletAuth(walletAuthInput);

  if (finalPayload.status === 'error') {
    console.error('WalletAuth failed', finalPayload);
    throw new Error('Wallet authentication failed');
  }

  const address = finalPayload.address;
  console.log('✅ WalletAuth success, address:', address);

  const provider = new ethers.providers.JsonRpcProvider(WORLDCHAIN_RPC);
  const signer = new MiniKitSigner(address, provider);

  console.log('✅ MiniKitSigner ready');

  return { address, signer };
}
