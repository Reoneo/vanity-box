import { MiniKit } from '@worldcoin/minikit-js';

/**
 * Check if a wallet address has completed World ID verification
 */
export async function checkWorldIdVerification(address: string): Promise<boolean> {
  if (!address) return false;

  const normalizedAddress = address.toLowerCase();
  
  // Check cache first
  const cached = getCachedVerificationStatus(normalizedAddress);
  if (cached !== null) {
    return cached;
  }

  try {
    // Check if user is verified via World Bridge API
    const response = await fetch(`https://usernames.worldcoin.org/v1/addresses/${normalizedAddress}`);
    
    if (response.ok) {
      const data = await response.json();
      // If the API returns a username, the address is verified
      const isVerified = !!(data?.username || data?.handle || data?.name);
      cacheVerificationStatus(normalizedAddress, isVerified);
      return isVerified;
    }
  } catch (error) {
    console.error('World ID verification check failed:', error);
  }

  // Try MiniKit user if available (for connected users)
  try {
    const mkUser = (MiniKit as any)?.user;
    if (mkUser?.address?.toLowerCase() === normalizedAddress && mkUser?.username) {
      cacheVerificationStatus(normalizedAddress, true);
      return true;
    }
  } catch (error) {
    console.error('MiniKit verification check failed:', error);
  }

  // Default to unverified
  cacheVerificationStatus(normalizedAddress, false);
  return false;
}

/**
 * Get cached verification status for an address
 */
export function getCachedVerificationStatus(address: string): boolean | null {
  const cacheKey = `worldid_verified_${address.toLowerCase()}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached === null) return null;
  return cached === 'true';
}

/**
 * Cache verification status for an address
 */
export function cacheVerificationStatus(address: string, isVerified: boolean): void {
  const cacheKey = `worldid_verified_${address.toLowerCase()}`;
  sessionStorage.setItem(cacheKey, isVerified ? 'true' : 'false');
}
