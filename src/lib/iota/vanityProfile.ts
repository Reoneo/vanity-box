import { callEdge } from '@/lib/supaInvoke';

// Platform constants
export const PLATFORM_CODES = {
  X: 1,
  TWITTER: 1,
  LINKEDIN: 2,
  FACEBOOK: 3,
  INSTAGRAM: 4,
  BLUESKY: 5,
  WHATSAPP: 6,
  TELEGRAM: 7,
  REDDIT: 8,
  SPOTIFY: 9,
  YOUTUBE: 10,
  GITHUB: 11,
  DISCORD: 12,
} as const;

export type PlatformCode = typeof PLATFORM_CODES[keyof typeof PLATFORM_CODES];

export interface SocialLink {
  platform: PlatformCode;
  url: string;
}

export interface OnchainProfileData {
  avatarUrl: string;
  headerUrl: string;
  bio: string;
  email: string;
  website: string;
  links: SocialLink[];
}

export interface ProfileNotarization {
  ipfsCid: string;
  sha256Hash: string;
  notarizedAt: string;
  gatewayUrl: string;
  verified?: boolean;
}

// Convert platform code to human-readable name
export function getPlatformName(code: PlatformCode): string {
  const names: Record<number, string> = {
    1: 'X',
    2: 'LinkedIn',
    3: 'Facebook',
    4: 'Instagram',
    5: 'Bluesky',
    6: 'WhatsApp',
    7: 'Telegram',
    8: 'Reddit',
    9: 'Spotify',
    10: 'YouTube',
    11: 'GitHub',
    12: 'Discord',
  };
  return names[code] || 'Unknown';
}

// Convert platform name to code
export function getPlatformCode(name: string): PlatformCode | null {
  const normalizedName = name.toUpperCase().replace(/[^A-Z]/g, '');
  return (PLATFORM_CODES as Record<string, PlatformCode>)[normalizedName] || null;
}

/**
 * Upload profile data to IPFS via Pinata and notarize the hash on IOTA
 */
export async function saveProfileToIPFS(
  iotaName: string,
  walletAddress: string,
  profileData: OnchainProfileData
): Promise<{ ipfsCid: string; sha256Hash: string; gatewayUrl: string }> {
  // Step 1: Upload to IPFS
  const uploadResult = await callEdge<{
    success: boolean;
    ipfsCid: string;
    sha256Hash: string;
    gatewayUrl: string;
    error?: string;
  }>('upload-profile-ipfs', {
    iotaName,
    walletAddress,
    avatarUrl: profileData.avatarUrl,
    headerUrl: profileData.headerUrl,
    bio: profileData.bio,
    email: profileData.email,
    website: profileData.website,
    links: profileData.links.filter(l => l.url.trim()),
  });

  if (!uploadResult?.success || !uploadResult.ipfsCid) {
    throw new Error(uploadResult?.error || 'Failed to upload profile to IPFS');
  }

  // Step 2: Notarize on IOTA
  const notarizeResult = await callEdge<{
    success: boolean;
    error?: string;
  }>('notarize-profile-iota', {
    iotaName,
    walletAddress,
    ipfsCid: uploadResult.ipfsCid,
    sha256Hash: uploadResult.sha256Hash,
  });

  if (!notarizeResult?.success) {
    console.warn('Notarization warning:', notarizeResult?.error);
    // Don't fail - IPFS upload succeeded, notarization is secondary
  }

  return {
    ipfsCid: uploadResult.ipfsCid,
    sha256Hash: uploadResult.sha256Hash,
    gatewayUrl: uploadResult.gatewayUrl,
  };
}

/**
 * Verify profile integrity by comparing IPFS content hash with notarized hash
 */
export async function verifyProfileIntegrity(
  iotaName: string
): Promise<{
  verified: boolean;
  reason: string;
  message: string;
  ipfsCid?: string;
  notarizedAt?: string;
  profile?: OnchainProfileData | null;
  gatewayUrl?: string;
}> {
  const result = await callEdge<{
    verified: boolean;
    reason: string;
    message: string;
    ipfsCid?: string;
    notarizedAt?: string;
    profile?: any;
    gatewayUrl?: string;
  }>('verify-profile-integrity', { iotaName });

  return result;
}

/**
 * Fetch profile from IPFS via the notarization record
 */
export async function fetchProfileFromIPFS(
  iotaName: string
): Promise<{ profile: OnchainProfileData | null; notarization: ProfileNotarization | null }> {
  try {
    const result = await verifyProfileIntegrity(iotaName);
    
    if (!result.verified || !result.profile) {
      return { profile: null, notarization: null };
    }

    const profile: OnchainProfileData = {
      avatarUrl: result.profile.avatarUrl || '',
      headerUrl: result.profile.headerUrl || '',
      bio: result.profile.bio || '',
      email: result.profile.email || '',
      website: result.profile.website || '',
      links: (result.profile.links || []).map((l: any) => ({
        platform: l.platform as PlatformCode,
        url: l.url || '',
      })),
    };

    const notarization: ProfileNotarization = {
      ipfsCid: result.ipfsCid || '',
      sha256Hash: '',
      notarizedAt: result.notarizedAt || '',
      gatewayUrl: result.gatewayUrl || '',
      verified: result.verified,
    };

    return { profile, notarization };
  } catch (error) {
    console.error('[VanityProfile] Error fetching from IPFS:', error);
    return { profile: null, notarization: null };
  }
}

/**
 * Create an empty profile data structure
 */
export function createEmptyProfile(): OnchainProfileData {
  return {
    avatarUrl: '',
    headerUrl: '',
    bio: '',
    email: '',
    website: '',
    links: [],
  };
}

/**
 * Validate profile data
 */
export function validateProfileData(profile: OnchainProfileData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (profile.avatarUrl.length > 512) {
    errors.push('Avatar URL must be 512 characters or less');
  }
  if (profile.headerUrl.length > 512) {
    errors.push('Header URL must be 512 characters or less');
  }
  if (profile.bio.length > 1000) {
    errors.push('Bio must be 1000 characters or less');
  }
  if (profile.email.length > 256) {
    errors.push('Email must be 256 characters or less');
  }
  if (profile.website.length > 512) {
    errors.push('Website URL must be 512 characters or less');
  }
  
  for (const link of profile.links) {
    if (link.url.length > 512) {
      errors.push(`${getPlatformName(link.platform)} URL must be 512 characters or less`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Simple in-memory cache for profile reads
const profileCache = new Map<string, { data: OnchainProfileData | null; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

export async function fetchProfileCached(
  iotaName: string
): Promise<{ profile: OnchainProfileData | null; notarization: ProfileNotarization | null }> {
  // Always fetch fresh data - no caching to avoid sync issues
  return fetchProfileFromIPFS(iotaName);
}

export function clearProfileCache(iotaName?: string): void {
  if (iotaName) {
    profileCache.delete(iotaName);
  } else {
    profileCache.clear();
  }
}
