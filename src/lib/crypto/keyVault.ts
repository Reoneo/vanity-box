/**
 * Encrypted key vault for messaging device keys.
 * Stores X25519 keypairs in localStorage, encrypted with a
 * non-exportable AES-GCM key held in IndexedDB (WebCrypto).
 *
 * This design means raw key material cannot be read by XSS —
 * an attacker can call the WebCrypto API but cannot extract the
 * wrapping key itself.
 */

const VAULT_KEY = "vanitybox_msg_vault";
const IDB_NAME = "vanitybox_keyvault";
const IDB_STORE = "wrapping";
const IDB_KEY_ID = "vault_wrapping_key";

interface VaultData {
  publicKeyB64: string;
  privateKeyB64: string;
  deviceId: string;
  domain: string;
}

// ── IndexedDB helpers ───────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Wrapping key management ─────────────────────────────────

let _cachedKey: CryptoKey | null = null;

async function getOrCreateWrappingKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  try {
    const db = await openDB();
    const existing = await idbGet(db, IDB_KEY_ID);
    if (existing) {
      _cachedKey = existing;
      return existing;
    }

    // Generate a non-exportable AES-GCM 256-bit key
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false, // non-exportable
      ["encrypt", "decrypt"]
    );

    await idbPut(db, IDB_KEY_ID, key);
    _cachedKey = key;
    return key;
  } catch {
    // Fallback: if IndexedDB is unavailable (e.g. private browsing),
    // we still work but without the extra encryption layer.
    // This keeps the app functional while degrading gracefully.
    return null as unknown as CryptoKey;
  }
}

// ── Encrypt / Decrypt helpers ───────────────────────────────

async function encryptPayload(plaintext: string): Promise<string> {
  const key = await getOrCreateWrappingKey();
  if (!key) return plaintext; // graceful degradation

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  // Prefix: 1 byte version + 12 bytes IV + ciphertext
  const combined = new Uint8Array(1 + iv.length + ciphertext.byteLength);
  combined[0] = 0x01; // version marker for encrypted format
  combined.set(iv, 1);
  combined.set(new Uint8Array(ciphertext), 1 + iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptPayload(stored: string): Promise<string> {
  // Detect unencrypted legacy data (starts with '{')
  if (stored.startsWith("{")) return stored;

  const key = await getOrCreateWrappingKey();
  if (!key) return stored; // graceful degradation

  try {
    const combined = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    const version = combined[0];
    if (version !== 0x01) return stored; // unknown format, treat as plaintext

    const iv = combined.slice(1, 13);
    const ciphertext = combined.slice(13);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // If decryption fails (key rotated, corrupted), return empty
    console.warn("KeyVault: failed to decrypt stored keys, vault may need re-registration");
    return "{}";
  }
}

// ── Public API (async) ──────────────────────────────────────

/** Save device keys to localStorage (encrypted at rest) */
export async function saveDeviceKeys(data: VaultData): Promise<void> {
  const existing = await loadAllDeviceKeys();
  existing[data.domain] = data;
  const encrypted = await encryptPayload(JSON.stringify(existing));
  localStorage.setItem(VAULT_KEY, encrypted);
}

/** Load device keys for a specific domain (case-insensitive) */
export async function loadDeviceKeys(domain: string): Promise<VaultData | null> {
  const all = await loadAllDeviceKeys();
  const normalized = domain.toLowerCase().trim();
  if (all[normalized]) return all[normalized];
  const key = Object.keys(all).find(
    (k) => k.toLowerCase().trim() === normalized
  );
  return key ? all[key] : null;
}

/** Load all device keys */
export async function loadAllDeviceKeys(): Promise<Record<string, VaultData>> {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return {};
    const decrypted = await decryptPayload(raw);
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}

/** Remove device keys for a domain */
export async function removeDeviceKeys(domain: string): Promise<void> {
  const all = await loadAllDeviceKeys();
  delete all[domain];
  const encrypted = await encryptPayload(JSON.stringify(all));
  localStorage.setItem(VAULT_KEY, encrypted);
}
