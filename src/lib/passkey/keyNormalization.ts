// P-256 key format normalization helpers for IOTA passkey compatibility
// Converts various WebAuthn key formats to 33-byte compressed P-256 keys

import { b64urlDecode } from './webauthn';

/**
 * P-256 SPKI DER header (26 bytes) as used by WebAuthn getPublicKey() and IOTA SDK.
 * SubjectPublicKeyInfo wrapping for secp256r1 (P-256) uncompressed point.
 */
export const SECP256R1_SPKI_HEADER = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
  0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03,
  0x42, 0x00,
]);

/**
 * Parse DER SPKI (91 bytes) → 65-byte uncompressed P-256 point.
 * Strict header match like IOTA SDK.
 */
export function parseP256SpkiDerToUncompressed(der: Uint8Array): Uint8Array {
  const expectedLen = SECP256R1_SPKI_HEADER.length + 65; // 26 + 65 = 91
  if (der.length !== expectedLen) {
    throw new Error(`Unexpected SPKI DER length: ${der.length}, expected ${expectedLen}`);
  }

  for (let i = 0; i < SECP256R1_SPKI_HEADER.length; i++) {
    if (der[i] !== SECP256R1_SPKI_HEADER[i]) {
      throw new Error('Unexpected SPKI header — not a P-256 key');
    }
  }

  const pt = der.slice(SECP256R1_SPKI_HEADER.length);
  if (pt[0] !== 0x04) {
    throw new Error('Unexpected point marker in SPKI');
  }

  return pt;
}

/**
 * 64-byte raw x||y → 65-byte uncompressed (0x04 || x || y).
 */
export function p256XY64ToUncompressed65(xy64: Uint8Array): Uint8Array {
  if (xy64.length !== 64) throw new Error('Expected 64 bytes x||y');
  const out = new Uint8Array(65);
  out[0] = 0x04;
  out.set(xy64.subarray(0, 32), 1);
  out.set(xy64.subarray(32, 64), 33);
  return out;
}

/**
 * 65-byte uncompressed (0x04 || x || y) → 33-byte compressed (0x02/0x03 || x).
 * Parity prefix: 0x02 if y is even, 0x03 if y is odd.
 */
export function p256UncompressedToCompressed(uncompressed65: Uint8Array): Uint8Array {
  if (uncompressed65.length !== 65 || uncompressed65[0] !== 0x04) {
    throw new Error('Expected uncompressed P-256 point (65 bytes, 0x04 prefix)');
  }

  const x = uncompressed65.subarray(1, 33);
  const y = uncompressed65.subarray(33, 65);

  // Check parity of y (last byte)
  const prefix = (y[31] & 1) === 0 ? 0x02 : 0x03;

  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(x, 1);
  return compressed;
}

/**
 * Extract P-256 public key from attestationObject's authData COSE key.
 * Used as fallback when getPublicKey() returns null.
 *
 * authData layout:
 *   rpIdHash (32) | flags (1) | signCount (4) | attestedCredentialData...
 *   attestedCredentialData: aaguid (16) | credIdLen (2) | credId (N) | credPubKey (CBOR)
 */
export function extractPublicKeyFromAuthData(authData: Uint8Array): {
  credentialId: Uint8Array;
  publicKeyUncompressed: Uint8Array;
  aaguid: Uint8Array;
} {
  const flags = authData[32];
  const atFlag = (flags & 0x40) !== 0;
  if (!atFlag) throw new Error('No attested credential data in authData');

  let offset = 32 + 1 + 4; // rpIdHash + flags + signCount

  // AAGUID (16 bytes)
  const aaguid = authData.slice(offset, offset + 16);
  offset += 16;

  // Credential ID length (2 bytes, big-endian)
  const credIdLen = (authData[offset] << 8) | authData[offset + 1];
  offset += 2;

  // Credential ID
  const credentialId = authData.slice(offset, offset + credIdLen);
  offset += credIdLen;

  // COSE key (CBOR) — parse manually for EC2 P-256
  // We do minimal CBOR parsing for the COSE_Key map
  const coseBytes = authData.slice(offset);
  const { x, y } = parseCoseEc2Key(coseBytes);

  const publicKeyUncompressed = new Uint8Array(65);
  publicKeyUncompressed[0] = 0x04;
  publicKeyUncompressed.set(x, 1);
  publicKeyUncompressed.set(y, 33);

  return { credentialId, publicKeyUncompressed, aaguid };
}

/**
 * Minimal CBOR parser for COSE_Key EC2 map.
 * Extracts x (-2) and y (-3) coordinates.
 */
function parseCoseEc2Key(data: Uint8Array): { x: Uint8Array; y: Uint8Array } {
  // COSE_Key is a CBOR map. For ES256 (P-256):
  //   1 (kty) => 2 (EC2)
  //   3 (alg) => -7 (ES256)
  //  -1 (crv) => 1 (P-256)
  //  -2 (x)   => bstr (32 bytes)
  //  -3 (y)   => bstr (32 bytes)

  let offset = 0;
  let x: Uint8Array | null = null;
  let y: Uint8Array | null = null;

  // Read the initial byte to determine map size
  const initial = data[offset++];
  const majorType = (initial >> 5) & 0x07;
  if (majorType !== 5) throw new Error('Expected CBOR map');

  let mapLen = initial & 0x1f;
  if (mapLen === 24) { mapLen = data[offset++]; }
  else if (mapLen === 25) { mapLen = (data[offset] << 8) | data[offset + 1]; offset += 2; }

  for (let i = 0; i < mapLen; i++) {
    const key = readCborInt(data, offset);
    offset = key.newOffset;

    const val = readCborValue(data, offset);
    offset = val.newOffset;

    // -2 => x coordinate
    if (key.value === -2 && val.bytes) {
      x = val.bytes;
    }
    // -3 => y coordinate
    if (key.value === -3 && val.bytes) {
      y = val.bytes;
    }
  }

  if (!x || !y || x.length !== 32 || y.length !== 32) {
    throw new Error('Failed to extract P-256 coordinates from COSE key');
  }

  return { x, y };
}

function readCborInt(data: Uint8Array, offset: number): { value: number; newOffset: number } {
  const initial = data[offset++];
  const majorType = (initial >> 5) & 0x07;
  let value = initial & 0x1f;

  if (value === 24) { value = data[offset++]; }
  else if (value === 25) { value = (data[offset] << 8) | data[offset + 1]; offset += 2; }
  else if (value === 26) {
    value = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    offset += 4;
  }

  // Major type 1 = negative integer
  if (majorType === 1) {
    value = -1 - value;
  }

  return { value, newOffset: offset };
}

function readCborValue(data: Uint8Array, offset: number): {
  value: number | null;
  bytes: Uint8Array | null;
  newOffset: number;
} {
  const initial = data[offset];
  const majorType = (initial >> 5) & 0x07;

  // Byte string (major type 2)
  if (majorType === 2) {
    offset++;
    let len = initial & 0x1f;
    if (len === 24) { len = data[offset++]; }
    else if (len === 25) { len = (data[offset] << 8) | data[offset + 1]; offset += 2; }
    const bytes = data.slice(offset, offset + len);
    return { value: null, bytes, newOffset: offset + len };
  }

  // Integer (major type 0 or 1)
  if (majorType === 0 || majorType === 1) {
    const result = readCborInt(data, offset);
    return { value: result.value, bytes: null, newOffset: result.newOffset };
  }

  // Text string (major type 3) — skip
  if (majorType === 3) {
    offset++;
    let len = initial & 0x1f;
    if (len === 24) { len = data[offset++]; }
    else if (len === 25) { len = (data[offset] << 8) | data[offset + 1]; offset += 2; }
    return { value: null, bytes: null, newOffset: offset + len };
  }

  // Boolean / simple values (major type 7)
  if (majorType === 7) {
    offset++;
    return { value: initial & 0x1f, bytes: null, newOffset: offset };
  }

  // Skip unknown
  offset++;
  return { value: null, bytes: null, newOffset: offset };
}

/**
 * Master normalizer: takes any WebAuthn key format and returns 33-byte compressed.
 *
 * Accepts:
 * - 33 bytes: already compressed, pass through
 * - 65 bytes: uncompressed (0x04 prefix)
 * - 64 bytes: raw x||y
 * - 91 bytes: DER SPKI
 */
export function normalizeToCompressed33(keyBytes: Uint8Array): Uint8Array {
  if (keyBytes.length === 33 && (keyBytes[0] === 0x02 || keyBytes[0] === 0x03)) {
    return keyBytes; // Already compressed
  }

  if (keyBytes.length === 65 && keyBytes[0] === 0x04) {
    return p256UncompressedToCompressed(keyBytes);
  }

  if (keyBytes.length === 64) {
    return p256UncompressedToCompressed(p256XY64ToUncompressed65(keyBytes));
  }

  if (keyBytes.length === 91) {
    const uncompressed = parseP256SpkiDerToUncompressed(keyBytes);
    return p256UncompressedToCompressed(uncompressed);
  }

  throw new Error(`Unsupported key length: ${keyBytes.length}`);
}
