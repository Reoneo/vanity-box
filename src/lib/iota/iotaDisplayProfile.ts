import type { OnchainProfileData, PlatformCode } from '@/lib/iota/vanityProfile';

/**
 * Convert an IPFS/IOTA onchain profile into the same shape that ProfileCard already renders
 * (a "web3.bio-like" profile), so we do NOT need to edit ProfileCard.tsx.
 */

export type Web3BioLikeProfile = {
  address: string | null;
  identity: string;
  platform: string;
  displayName: string | null;
  avatar: string | null;
  header: string | null;
  description: string | null;
  website: string | null;
  url: string | null;
  email?: string | null;
  links: Record<string, any>;
  iotaDomain?: string;
};

function normalizeUrlMaybe(url: string | null | undefined): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;

  // Already has protocol
  if (/^https?:\/\//i.test(raw)) return raw;

  // mailto:
  if (/^mailto:/i.test(raw)) return raw;

  // assume https for domain-ish inputs
  return `https://${raw}`;
}

function platformCodeToKey(code: PlatformCode): string {
  switch (code) {
    case 1:
      return 'x';
    case 2:
      return 'linkedin';
    case 3:
      return 'facebook';
    case 4:
      return 'instagram';
    case 5:
      return 'bluesky';
    case 6:
      return 'whatsapp';
    case 7:
      return 'telegram';
    case 8:
      return 'reddit';
    case 9:
      return 'spotify';
    case 10:
      return 'youtube';
    case 11:
      return 'github';
    default:
      return 'website';
  }
}

export function makeIotaDisplayProfile(args: {
  base: any;
  iotaOnchainProfile: OnchainProfileData;
  identity: string; // e.g. "brah.vanity.iota"
  ownerAddress?: string | null;
}): Web3BioLikeProfile {
  const { base, iotaOnchainProfile, identity, ownerAddress } = args;

  // Convert array links -> existing UI links object format
  const links: Record<string, any> = {};
  for (const l of iotaOnchainProfile.links || []) {
    const key = platformCodeToKey(l.platform);
    const url = normalizeUrlMaybe(l.url);
    if (!url) continue;
    links[key] = { link: url };
  }

  const website = normalizeUrlMaybe(iotaOnchainProfile.website);
  const avatar = normalizeUrlMaybe(iotaOnchainProfile.avatarUrl);
  const header = normalizeUrlMaybe(iotaOnchainProfile.headerUrl);

  return {
    ...(base || {}),
    platform: 'iota',
    identity,
    iotaDomain: identity,
    displayName: identity,
    address: ownerAddress || base?.address || null,
    avatar: avatar || base?.avatar || null,
    header: header || base?.header || null,
    description: (iotaOnchainProfile.bio || '').trim() || base?.description || null,
    email: (iotaOnchainProfile.email || '').trim() || null,
    website,
    url: website,
    links,
  };
}
