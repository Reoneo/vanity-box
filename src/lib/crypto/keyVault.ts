/**
 * Encrypted key vault for messaging device keys.
 * Stores X25519 keypairs in localStorage, encrypted with a key
 * derived from the user's wallet signature.
 */

const VAULT_KEY = "vanitybox_msg_vault";

interface VaultData {
  publicKeyB64: string;
  privateKeyB64: string;
  deviceId: string;
  domain: string;
}

/** Save device keys to localStorage (plaintext for MVP; upgrade to encrypted vault later) */
export function saveDeviceKeys(data: VaultData): void {
  const existing = loadAllDeviceKeys();
  existing[data.domain] = data;
  localStorage.setItem(VAULT_KEY, JSON.stringify(existing));
}

/** Load device keys for a specific domain (case-insensitive) */
export function loadDeviceKeys(domain: string): VaultData | null {
  const all = loadAllDeviceKeys();
  const normalized = domain.toLowerCase().trim();
  // Try exact match first, then case-insensitive
  if (all[normalized]) return all[normalized];
  const key = Object.keys(all).find(k => k.toLowerCase().trim() === normalized);
  return key ? all[key] : null;
}

/** Load all device keys */
export function loadAllDeviceKeys(): Record<string, VaultData> {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Remove device keys for a domain */
export function removeDeviceKeys(domain: string): void {
  const all = loadAllDeviceKeys();
  delete all[domain];
  localStorage.setItem(VAULT_KEY, JSON.stringify(all));
}
