/**
 * Derive a real IOTA address from a compressed P-256 (secp256r1) public key
 * using the IOTA SDK's PasskeyPublicKey class.
 */

import { PasskeyPublicKey } from '@iota/iota-sdk/keypairs/passkey';

/**
 * Derive an IOTA address from a 33-byte compressed P-256 public key.
 * Uses the IOTA SDK's PasskeyPublicKey which internally uses
 * blake2b(flag(0x06) || compressed_pubkey, 32).
 */
export function derivePasskeyIotaAddress(compressedPubKey: Uint8Array): string {
  if (compressedPubKey.length !== 33) {
    throw new Error(`Expected 33-byte compressed P-256 key, got ${compressedPubKey.length}`);
  }
  const pk = new PasskeyPublicKey(compressedPubKey);
  return pk.toIotaAddress();
}
