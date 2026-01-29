import { iotaJsonRpc, IOTA_NETWORK, type IotaNetwork } from './client';

// Environment variables for the deployed Move contract
// These will be set after the contract is deployed
export const VANITY_PROFILE_PACKAGE_ID = import.meta.env.VITE_VANITY_PROFILE_PACKAGE_ID || '';
export const VANITY_PROFILE_REGISTRY_ID = import.meta.env.VITE_VANITY_PROFILE_REGISTRY_ID || '';
export const IOTA_NAMES_NAME_NFT_TYPE = import.meta.env.VITE_IOTA_NAMES_NAME_NFT_TYPE || '';

// Platform constants matching Move contract
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

// Convert platform code to human-readable name
export function getPlatformName(code: PlatformCode): string {
  const names: Record<PlatformCode, string> = {
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
  };
  return names[code] || 'Unknown';
}

// Convert platform name to code
export function getPlatformCode(name: string): PlatformCode | null {
  const normalizedName = name.toUpperCase().replace(/[^A-Z]/g, '');
  return (PLATFORM_CODES as Record<string, PlatformCode>)[normalizedName] || null;
}

/**
 * Fetch onchain profile data from the Move registry
 * Uses getDynamicFieldObject to read from the table
 */
export async function fetchOnchainProfile(
  registryId: string,
  nameObjectId: string,
  network: IotaNetwork = IOTA_NETWORK
): Promise<OnchainProfileData | null> {
  try {
    if (!registryId || !nameObjectId) {
      console.log('[VanityProfile] Missing registryId or nameObjectId');
      return null;
    }
    
    console.log(`[VanityProfile] Fetching profile for nameObjectId: ${nameObjectId}`);
    
    // Read the dynamic field from the registry table
    // The key is the Name NFT object ID
    const result = await iotaJsonRpc<{ content?: { fields?: { value?: any } } } | null>(
      'iota_getDynamicFieldObject',
      [
        registryId,
        {
          type: '0x2::object::ID',
          value: nameObjectId
        }
      ],
      network
    );
    
    if (!result?.content?.fields?.value) {
      console.log('[VanityProfile] No profile found for this name');
      return null;
    }
    
    const data = result.content.fields.value;
    
    // Parse the profile data from Move struct format
    const profile: OnchainProfileData = {
      avatarUrl: data.avatar_url || '',
      headerUrl: data.header_url || '',
      bio: data.bio || '',
      email: data.email || '',
      website: data.website || '',
      links: parseLinks(data.links || []),
    };
    
    console.log('[VanityProfile] Fetched profile:', profile);
    return profile;
  } catch (error) {
    console.error('[VanityProfile] Error fetching profile:', error);
    return null;
  }
}

// Parse links from Move vector format
function parseLinks(linksData: any[]): SocialLink[] {
  if (!Array.isArray(linksData)) return [];
  
  return linksData.map(link => ({
    platform: link.platform as PlatformCode,
    url: link.url || '',
  })).filter(link => link.url);
}

/**
 * Check if the Move contract is deployed and configured
 */
export function isContractConfigured(): boolean {
  return !!(VANITY_PROFILE_PACKAGE_ID && VANITY_PROFILE_REGISTRY_ID);
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
 * Validate profile data against Move contract constraints
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

export async function fetchOnchainProfileCached(
  registryId: string,
  nameObjectId: string,
  network: IotaNetwork = IOTA_NETWORK
): Promise<OnchainProfileData | null> {
  const cacheKey = `${registryId}-${nameObjectId}`;
  const cached = profileCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[VanityProfile] Returning cached profile');
    return cached.data;
  }
  
  const data = await fetchOnchainProfile(registryId, nameObjectId, network);
  profileCache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

export function clearProfileCache(registryId?: string, nameObjectId?: string): void {
  if (registryId && nameObjectId) {
    profileCache.delete(`${registryId}-${nameObjectId}`);
  } else {
    profileCache.clear();
  }
}
