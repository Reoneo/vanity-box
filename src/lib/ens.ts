/**
 * ENS Helper Library
 * Contains utilities for ENS name validation, hashing, and contract interactions
 */

import { normalize } from 'viem/ens';
import { keccak256, encodePacked, formatEther, parseEther, type Address } from 'viem';

// ============================================
// ENS CONTRACT ADDRESSES (Ethereum Mainnet)
// ============================================

/** ETH Registrar Controller - handles .eth registration (commit-reveal) */
export const ETH_REGISTRAR_CONTROLLER = '0x253553366Da8546fC250F225fe3d25d0C782303b' as const;

/** Base Registrar - NFT contract for .eth names */
export const BASE_REGISTRAR = '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85' as const;

/** ENS Registry - main registry contract */
export const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;

/** Public Resolver */
export const PUBLIC_RESOLVER = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63' as const;

// ============================================
// CONTRACT ABIs (minimal, only what we need)
// ============================================

export const ETH_REGISTRAR_CONTROLLER_ABI = [
  // Check if name is available
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Get rental price for name + duration
  {
    name: 'rentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [
      { 
        name: 'price', 
        type: 'tuple',
        components: [
          { name: 'base', type: 'uint256' },
          { name: 'premium', type: 'uint256' },
        ]
      }
    ],
  },
  // Make commitment hash for commit-reveal
  {
    name: 'makeCommitment',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'secret', type: 'bytes32' },
      { name: 'resolver', type: 'address' },
      { name: 'data', type: 'bytes[]' },
      { name: 'reverseRecord', type: 'bool' },
      { name: 'ownerControlledFuses', type: 'uint16' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  // Submit commitment (step 1)
  {
    name: 'commit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: [],
  },
  // Register name (step 2, after waiting ~60s)
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'secret', type: 'bytes32' },
      { name: 'resolver', type: 'address' },
      { name: 'data', type: 'bytes[]' },
      { name: 'reverseRecord', type: 'bool' },
      { name: 'ownerControlledFuses', type: 'uint16' },
    ],
    outputs: [],
  },
  // Check commitment timestamp
  {
    name: 'commitments',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Minimum commitment age (usually 60 seconds)
  {
    name: 'minCommitmentAge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Maximum commitment age (usually 24 hours)
  {
    name: 'maxCommitmentAge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const BASE_REGISTRAR_ABI = [
  // Check if name is available (by labelhash)
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Get name expiry
  {
    name: 'nameExpires',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ============================================
// NAME VALIDATION & NORMALIZATION
// ============================================

/**
 * Normalize an ENS name according to UTS-46
 * Throws if name is invalid
 */
export function normalizeName(name: string): string {
  try {
    return normalize(name);
  } catch {
    throw new Error(`Invalid ENS name: ${name}`);
  }
}

/**
 * Extract the label from a .eth name (e.g., "vitalik.eth" -> "vitalik")
 */
export function extractLabel(name: string): string {
  const normalized = name.toLowerCase().trim();
  if (normalized.endsWith('.eth')) {
    return normalized.slice(0, -4);
  }
  return normalized;
}

/**
 * Validate that a label is valid for .eth registration
 * - Must be at least 3 characters
 * - Must be normalizable
 */
export function validateLabel(label: string): { valid: boolean; error?: string } {
  if (!label || label.length < 3) {
    return { valid: false, error: 'Name must be at least 3 characters' };
  }
  
  try {
    normalizeName(`${label}.eth`);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
}

// ============================================
// HASHING UTILITIES
// ============================================

/**
 * Compute the labelhash (keccak256 of the label)
 * Used for Base Registrar lookups
 */
export function labelhash(label: string): `0x${string}` {
  return keccak256(encodePacked(['string'], [label]));
}

/**
 * Convert labelhash to tokenId (BigInt)
 */
export function labelhashToTokenId(hash: `0x${string}`): bigint {
  return BigInt(hash);
}

// ============================================
// PRICING UTILITIES
// ============================================

/**
 * Format ETH price for display
 */
export function formatPrice(wei: bigint): string {
  const eth = formatEther(wei);
  const num = parseFloat(eth);
  if (num < 0.0001) return '< 0.0001 ETH';
  if (num < 0.01) return `${num.toFixed(4)} ETH`;
  return `${num.toFixed(3)} ETH`;
}

/**
 * Duration in seconds from years
 */
export function yearsToSeconds(years: number): bigint {
  return BigInt(years * 365 * 24 * 60 * 60);
}

// ============================================
// SECRET MANAGEMENT (localStorage)
// ============================================

const COMMITMENT_STORAGE_KEY = 'ens_commitments';

interface StoredCommitment {
  name: string;
  owner: string;
  secret: string;
  duration: number; // in years
  commitment: string;
  timestamp: number;
  txHash?: string;
}

/**
 * Generate a random secret for commitment
 */
export function generateSecret(): `0x${string}` {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Store commitment in localStorage
 */
export function storeCommitment(data: StoredCommitment): void {
  try {
    const existing = getStoredCommitments();
    const key = `${data.name.toLowerCase()}_${data.owner.toLowerCase()}`;
    existing[key] = data;
    localStorage.setItem(COMMITMENT_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to store commitment:', e);
  }
}

/**
 * Get all stored commitments
 */
export function getStoredCommitments(): Record<string, StoredCommitment> {
  try {
    const stored = localStorage.getItem(COMMITMENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Get commitment for a specific name + owner
 */
export function getCommitment(name: string, owner: string): StoredCommitment | null {
  const commitments = getStoredCommitments();
  const key = `${name.toLowerCase()}_${owner.toLowerCase()}`;
  return commitments[key] || null;
}

/**
 * Remove commitment from storage (after successful registration)
 */
export function removeCommitment(name: string, owner: string): void {
  try {
    const existing = getStoredCommitments();
    const key = `${name.toLowerCase()}_${owner.toLowerCase()}`;
    delete existing[key];
    localStorage.setItem(COMMITMENT_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to remove commitment:', e);
  }
}

/**
 * Clean up expired commitments (older than 24 hours)
 */
export function cleanupExpiredCommitments(): void {
  try {
    const existing = getStoredCommitments();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
    
    let hasChanges = false;
    for (const key of Object.keys(existing)) {
      if (now - existing[key].timestamp > maxAge) {
        delete existing[key];
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      localStorage.setItem(COMMITMENT_STORAGE_KEY, JSON.stringify(existing));
    }
  } catch (e) {
    console.error('Failed to cleanup commitments:', e);
  }
}

// ============================================
// REGISTRATION STATUS
// ============================================

export type RegistrationStep = 'idle' | 'committing' | 'waiting' | 'registering' | 'success' | 'error';

export interface RegistrationState {
  step: RegistrationStep;
  name: string;
  duration: number; // years
  price: bigint;
  secret: `0x${string}`;
  commitment?: `0x${string}`;
  commitTxHash?: string;
  registerTxHash?: string;
  waitEndTime?: number; // timestamp when wait period ends
  error?: string;
}
