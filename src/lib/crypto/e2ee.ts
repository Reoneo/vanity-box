/**
 * End-to-End Encryption library using libsodium XChaCha20-Poly1305
 * + sealed box for per-recipient key wrapping.
 *
 * All message content is encrypted client-side; only ciphertext leaves the device.
 */
import sodium from "libsodium-wrappers-sumo";

export type EncryptedPayload = {
  cipherSuite: "xchacha20poly1305";
  nonceB64: string;
  adB64: string;
  ciphertextB64: string;
};

export type RecipientEnvelope = {
  recipientDeviceId: string;
  wrappedMsgKeyB64: string;
};

export interface E2EEKeypair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

let _ready = false;
async function ensureReady() {
  if (!_ready) {
    await sodium.ready;
    _ready = true;
  }
}

const b64 = (u8: Uint8Array) =>
  sodium.to_base64(u8, sodium.base64_variants.ORIGINAL);
const fromB64 = (s: string) =>
  sodium.from_base64(s, sodium.base64_variants.ORIGINAL);

/** Generate a new X25519 keypair for device encryption */
export async function generateKeypair(): Promise<E2EEKeypair> {
  await ensureReady();
  const kp = sodium.crypto_box_keypair();
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

/** Export keypair to base64 for storage */
export function keypairToB64(kp: E2EEKeypair) {
  return {
    publicKeyB64: b64(kp.publicKey),
    privateKeyB64: b64(kp.privateKey),
  };
}

/** Import keypair from base64 */
export function keypairFromB64(pub: string, priv: string): E2EEKeypair {
  return { publicKey: fromB64(pub), privateKey: fromB64(priv) };
}

/**
 * Encrypt a plaintext message for multiple recipient devices.
 * Returns the encrypted payload + per-device envelopes.
 */
export async function encryptForRecipients(
  plaintext: Uint8Array,
  recipientDevicePubKeys: Array<{
    deviceId: string;
    x25519PubKey: Uint8Array;
  }>,
  associatedData: Record<string, unknown> = {}
): Promise<{ payload: EncryptedPayload; envelopes: RecipientEnvelope[] }> {
  await ensureReady();

  // Random per-message symmetric key
  const msgKey = sodium.randombytes_buf(32);
  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );

  const adBytes = new TextEncoder().encode(JSON.stringify(associatedData));

  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    adBytes,
    null,
    nonce,
    msgKey
  );

  const envelopes = recipientDevicePubKeys.map(
    ({ deviceId, x25519PubKey }) => ({
      recipientDeviceId: deviceId,
      wrappedMsgKeyB64: b64(sodium.crypto_box_seal(msgKey, x25519PubKey)),
    })
  );

  return {
    payload: {
      cipherSuite: "xchacha20poly1305",
      nonceB64: b64(nonce),
      adB64: b64(adBytes),
      ciphertextB64: b64(ciphertext),
    },
    envelopes,
  };
}

/**
 * Decrypt a message given your sealed-box envelope and the payload.
 */
export async function decryptFromEnvelope(
  payload: EncryptedPayload,
  wrappedMsgKeyB64: string,
  recipientKeypair: E2EEKeypair
): Promise<Uint8Array> {
  await ensureReady();

  const msgKey = sodium.crypto_box_seal_open(
    fromB64(wrappedMsgKeyB64),
    recipientKeypair.publicKey,
    recipientKeypair.privateKey
  );

  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    fromB64(payload.ciphertextB64),
    fromB64(payload.adB64),
    fromB64(payload.nonceB64),
    msgKey
  );

  return plaintext;
}

/** Compute SHA-256 hash of data (returns hex string) */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const buf = new Uint8Array(data).buffer as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Build a Merkle tree from leaf hashes.
 * Returns { root, proofs } where proofs[i] = { leafHash, leafIndex, proof: [{hash, side}] }
 */
export async function buildMerkleTree(
  leafHashes: string[]
): Promise<{
  root: string;
  proofs: Array<{
    leafHash: string;
    leafIndex: number;
    proof: Array<{ hash: string; side: "left" | "right" }>;
  }>;
}> {
  if (leafHashes.length === 0) throw new Error("No leaves");

  // Pad to power of 2
  const n = Math.pow(2, Math.ceil(Math.log2(leafHashes.length)));
  const padded = [...leafHashes];
  while (padded.length < n) padded.push(padded[padded.length - 1]);

  // Build tree bottom-up
  const layers: string[][] = [padded];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next: string[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const combined = new TextEncoder().encode(prev[i] + prev[i + 1]);
      next.push(await sha256Hex(combined));
    }
    layers.push(next);
  }

  const root = layers[layers.length - 1][0];

  // Build proofs
  const proofs = leafHashes.map((leafHash, leafIndex) => {
    const proof: Array<{ hash: string; side: "left" | "right" }> = [];
    let idx = leafIndex;
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const sibIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      proof.push({
        hash: layers[layer][sibIdx],
        side: idx % 2 === 0 ? "right" : "left",
      });
      idx = Math.floor(idx / 2);
    }
    return { leafHash, leafIndex, proof };
  });

  return { root, proofs };
}

/**
 * Verify a Merkle proof against a root hash.
 */
export async function verifyMerkleProof(
  leafHash: string,
  proof: Array<{ hash: string; side: "left" | "right" }>,
  expectedRoot: string
): Promise<boolean> {
  let current = leafHash;
  for (const { hash, side } of proof) {
    const pair =
      side === "left"
        ? new TextEncoder().encode(hash + current)
        : new TextEncoder().encode(current + hash);
    current = await sha256Hex(pair);
  }
  return current === expectedRoot;
}

/**
 * Compute domain-separated leaf hash for a message.
 */
export async function computeLeafHash(
  messageId: string,
  ciphertextSha256: string,
  sentAtMs: number
): Promise<string> {
  const input = `vanitybox-msg-v1|${messageId}|${ciphertextSha256}|${sentAtMs}`;
  return sha256Hex(new TextEncoder().encode(input));
}
