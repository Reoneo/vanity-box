// IOTA SDK-compatible passkey signer
// Wraps WebAuthn assertion data into the format expected by IOTA's PasskeyAuthenticator

import { b64urlEncode, b64urlDecode, getPasskeyAssertion, serializeAssertionCredential } from './webauthn';
import { normalizeToCompressed33 } from './keyNormalization';

/**
 * IOTA passkey signature flag byte.
 * The IOTA SDK uses a specific flag for passkey signatures.
 */
const PASSKEY_SIGNATURE_FLAG = 0x06; // PasskeyAuthenticator flag

/**
 * Normalize an ECDSA signature to low-S canonical form.
 * P-256 order N = FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
 */
const P256_ORDER = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551');
const P256_HALF_ORDER = P256_ORDER >> BigInt(1);

function bigIntFromBytes(bytes: Uint8Array): bigint {
  let hex = '0x';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return BigInt(hex);
}

function bigIntToBytes(n: bigint, length: number): Uint8Array {
  const hex = n.toString(16).padStart(length * 2, '0');
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

/**
 * Parse a DER-encoded ECDSA signature into r, s components.
 */
function parseDerSignature(der: Uint8Array): { r: Uint8Array; s: Uint8Array } {
  if (der[0] !== 0x30) throw new Error('Invalid DER signature');

  let offset = 2; // skip SEQUENCE tag + length

  // R
  if (der[offset] !== 0x02) throw new Error('Expected INTEGER tag for R');
  offset++;
  const rLen = der[offset++];
  let rBytes = der.slice(offset, offset + rLen);
  offset += rLen;

  // S
  if (der[offset] !== 0x02) throw new Error('Expected INTEGER tag for S');
  offset++;
  const sLen = der[offset++];
  let sBytes = der.slice(offset, offset + sLen);

  // Strip leading zeros and pad to 32 bytes
  while (rBytes.length > 32 && rBytes[0] === 0) rBytes = rBytes.slice(1);
  while (sBytes.length > 32 && sBytes[0] === 0) sBytes = sBytes.slice(1);

  const r = new Uint8Array(32);
  const s = new Uint8Array(32);
  r.set(rBytes, 32 - rBytes.length);
  s.set(sBytes, 32 - sBytes.length);

  return { r, s };
}

/**
 * Normalize S to low-S form: if S > N/2, replace with N - S.
 */
function normalizeS(r: Uint8Array, s: Uint8Array): { r: Uint8Array; s: Uint8Array } {
  const sInt = bigIntFromBytes(s);
  if (sInt > P256_HALF_ORDER) {
    const normalized = P256_ORDER - sInt;
    return { r, s: bigIntToBytes(normalized, 32) };
  }
  return { r, s };
}

/**
 * Build a compact 64-byte signature from r and s (each 32 bytes).
 */
function compactSignature(r: Uint8Array, s: Uint8Array): Uint8Array {
  const sig = new Uint8Array(64);
  sig.set(r, 0);
  sig.set(s, 32);
  return sig;
}

/**
 * Build the IOTA-compatible "userSignature" from a WebAuthn assertion.
 * Format: flag (1) || compact_sig (64) || compressed_pubkey (33) = 98 bytes
 */
export function buildIotaUserSignature(
  derSignature: Uint8Array,
  compressedPublicKey: Uint8Array
): Uint8Array {
  const { r, s } = parseDerSignature(derSignature);
  const { r: rNorm, s: sNorm } = normalizeS(r, s);
  const compact = compactSignature(rNorm, sNorm);

  // flag || sig || pubkey
  const result = new Uint8Array(1 + 64 + 33);
  result[0] = PASSKEY_SIGNATURE_FLAG;
  result.set(compact, 1);
  result.set(compressedPublicKey, 65);
  return result;
}

/**
 * Build the complete PasskeyAuthenticator payload for IOTA transaction signing.
 * This wraps the WebAuthn assertion data in the format the IOTA SDK expects.
 */
export interface PasskeyAuthenticatorPayload {
  authenticatorData: string; // base64url
  clientDataJson: string; // base64url
  userSignature: string; // base64url of flag || sig || pubkey
}

/**
 * Sign a message/transaction digest using a passkey and return IOTA-compatible signature data.
 *
 * @param challenge - The bytes to sign (e.g., transaction digest)
 * @param credentialId - The credential ID of the passkey to use
 * @param rpId - The RP ID for the assertion
 * @param compressedPublicKey - The 33-byte compressed P-256 public key
 */
export async function signWithPasskey(
  challenge: Uint8Array,
  credentialId: Uint8Array,
  rpId: string,
  compressedPublicKey: Uint8Array
): Promise<PasskeyAuthenticatorPayload> {
  const assertion = await getPasskeyAssertion({
    challenge: challenge.buffer.slice(challenge.byteOffset, challenge.byteOffset + challenge.byteLength) as ArrayBuffer,
    rpId,
    allowCredentials: [
      {
        id: credentialId.buffer.slice(credentialId.byteOffset, credentialId.byteOffset + credentialId.byteLength) as ArrayBuffer,
        type: 'public-key' as const,
      },
    ],
    userVerification: 'required',
    timeout: 60_000,
  });

  const response = assertion.response as AuthenticatorAssertionResponse;

  const derSig = new Uint8Array(response.signature);
  const userSignature = buildIotaUserSignature(derSig, compressedPublicKey);

  return {
    authenticatorData: b64urlEncode(new Uint8Array(response.authenticatorData)),
    clientDataJson: b64urlEncode(new Uint8Array(response.clientDataJSON)),
    userSignature: b64urlEncode(userSignature),
  };
}
