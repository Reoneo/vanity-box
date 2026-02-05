// Encrypted Vault Utilities for IOTA Identity
// Uses WebCrypto AES-GCM with wallet-signature-derived key

import type { IdentityVault, VerifiableCredential, VerificationResult } from '@/types/identity';

const VAULT_STORAGE_KEY = 'vanity_identity_vault';
const SALT_KEY = 'vanity_vault_salt';

// Generate random bytes
function getRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Convert string to Uint8Array
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert Uint8Array to base64
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

// Convert base64 to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive encryption key from wallet signature using PBKDF2
async function deriveKey(signature: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signature);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt vault data
export async function encryptVault(vault: IdentityVault, walletSignature: string): Promise<string> {
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const key = await deriveKey(walletSignature, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(vault));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext.buffer as ArrayBuffer
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return bytesToBase64(combined);
}

// Decrypt vault data
export async function decryptVault(encryptedData: string, walletSignature: string): Promise<IdentityVault | null> {
  try {
    const combined = base64ToBytes(encryptedData);
    
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const key = await deriveKey(walletSignature, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    const plaintext = new TextDecoder().decode(decrypted);
    return JSON.parse(plaintext) as IdentityVault;
  } catch (error) {
    console.error('Failed to decrypt vault:', error);
    return null;
  }
}

// Save vault to localStorage (encrypted)
export async function saveVaultToStorage(
  holderDid: string | null,
  vcList: VerifiableCredential[],
  issuerDid: string | null,
  lastVerification: VerificationResult | null,
  walletSignature: string
): Promise<void> {
  const vault: IdentityVault = {
    holderDid,
    vcList,
    issuerDid,
    lastVerification,
    encryptedAt: new Date().toISOString(),
  };

  const encrypted = await encryptVault(vault, walletSignature);
  localStorage.setItem(VAULT_STORAGE_KEY, encrypted);
}

// Load vault from localStorage
export async function loadVaultFromStorage(walletSignature: string): Promise<IdentityVault | null> {
  const encrypted = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!encrypted) return null;

  return decryptVault(encrypted, walletSignature);
}

// Export vault as encrypted string
export async function exportVaultAsString(walletSignature: string): Promise<string | null> {
  const encrypted = localStorage.getItem(VAULT_STORAGE_KEY);
  return encrypted;
}

// Import vault from encrypted string
export async function importVaultFromString(
  encryptedData: string, 
  walletSignature: string
): Promise<IdentityVault | null> {
  const vault = await decryptVault(encryptedData, walletSignature);
  if (vault) {
    localStorage.setItem(VAULT_STORAGE_KEY, encryptedData);
  }
  return vault;
}

// Clear vault from storage
export function clearVaultStorage(): void {
  localStorage.removeItem(VAULT_STORAGE_KEY);
  localStorage.removeItem(SALT_KEY);
}

// Generate a random nonce for VP challenge
export function generateNonce(): string {
  const bytes = getRandomBytes(32);
  return bytesToBase64(bytes);
}

// Calculate expiry time
export function calculateExpiry(secondsFromNow: number): string {
  const expiry = new Date();
  expiry.setSeconds(expiry.getSeconds() + secondsFromNow);
  return expiry.toISOString();
}

// Check if a timestamp has expired
export function isExpired(isoTimestamp: string): boolean {
  return new Date(isoTimestamp) < new Date();
}
