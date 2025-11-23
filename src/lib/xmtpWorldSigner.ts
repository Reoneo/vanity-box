import type { Signer, Identifier } from '@xmtp/browser-sdk';
import { MiniKit } from '@worldcoin/minikit-js';

const WORLD_CHAIN_ID = 480n; // World Chain mainnet

// Tiny helper – converts 0x… hex to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * XMTP SCW signer backed by World App (MiniKit).
 * World App wallet is a Smart Contract Wallet on World Chain (chainId 480).
 */
export function createWorldXmtpSigner(walletAddress: string): Signer {
  const identifier: Identifier = {
    identifier: walletAddress.toLowerCase(),
    identifierKind: 'Ethereum',
  };

  return {
    type: 'SCW', // Smart Contract Wallet
    getIdentifier: () => identifier,
    // XMTP asks us to sign arbitrary strings; World App returns an EIP-191 sig
    signMessage: async (message: string): Promise<Uint8Array> => {
      const { finalPayload } = await MiniKit.commandsAsync.signMessage({
        message,
      });

      if (!finalPayload || finalPayload.status !== 'success') {
        throw new Error('World App signMessage failed or was cancelled');
      }

      return hexToBytes(finalPayload.signature);
    },
    // Let XMTP know which chain this SCW lives on
    getChainId: () => WORLD_CHAIN_ID,
  };
}
