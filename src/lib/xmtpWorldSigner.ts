import type { Signer, Identifier } from '@xmtp/browser-sdk';
import { MiniKit } from '@worldcoin/minikit-js';

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
 * Create an XMTP Signer that uses World App via MiniKit.signMessage.
 * `walletAddress` should come from Wallet Auth (MiniKit.commands.walletAuth).
 */
export function createWorldXmtpSigner(walletAddress: string): Signer {
  const identifier: Identifier = {
    identifier: walletAddress,
    identifierKind: 'Ethereum', // XMTP treats this as an Ethereum identity
  };

  return {
    type: 'EOA',
    getIdentifier: async () => identifier,
    // XMTP only needs signMessage in browser env
    signMessage: async (message: string): Promise<Uint8Array> => {
      // Ask World App to sign the message
      const { finalPayload } = await MiniKit.commandsAsync.signMessage({
        message,
      });

      if (!finalPayload || finalPayload.status !== 'success') {
        throw new Error('World App signMessage failed or was cancelled');
      }

      // XMTP expects bytes, convert 0x… signature to Uint8Array
      return hexToBytes(finalPayload.signature);
    },
  };
}
