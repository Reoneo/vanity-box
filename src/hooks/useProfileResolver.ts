import { useState, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { iotaJsonRpc, isValidIotaAddress } from '@/lib/iota/client';

/**
 * Profile data structure returned by the resolver
 */
export interface ResolvedProfile {
  address: string | null;
  identity: string;
  platform: string;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  header: string | null;
  website: string | null;
  url: string | null;
  links: Record<string, any>;
  followerCount?: number | null;
  followingCount?: number | null;
  ensRecords?: Record<string, string>;
  hlDomain?: string;
  vetDomain?: string;
  iotaDomain?: string;
  farcaster?: any;
  location?: string | null;
  email?: string | null;
  udDomain?: string;
}

export interface ResolverResult {
  ok: boolean;
  source: 'web3bio' | 'iota' | 'vet' | 'ud' | 'fallback';
  profile: ResolvedProfile | null;
  notFound?: boolean;
  error?: string;
  debug?: { tried: string[]; timingsMs?: Record<string, number> };
}

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retry with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  timeoutMs = 10000
): Promise<Response | null> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      // Retry on 429 (rate limit) or 5xx errors
      if (response.status === 429 || response.status >= 500) {
        if (i < maxRetries) {
          const delay = Math.pow(2, i) * 500;
          console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms for ${url}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (err: any) {
      console.error(`Fetch attempt ${i + 1} failed for ${url}:`, err.message);
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Viem public client for direct ENS resolution on Ethereum mainnet
 */
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
});

/**
 * Resolve .eth domain directly via viem (Universal Resolver on-chain)
 * Returns rich profile data: address, avatar, text records, etc.
 */
async function fetchEnsDirectProfile(name: string): Promise<any | null> {
  console.log(`🔍 [Client] Direct ENS resolution for: ${name}`);

  try {
    const normalizedName = normalize(name);

    // Batch all calls in parallel for speed
    const [address, avatar, description, url, twitter, github, discord, email, displayName] =
      await Promise.all([
        ensClient.getEnsAddress({ name: normalizedName }).catch(() => null),
        ensClient.getEnsAvatar({ name: normalizedName }).catch(() => null),
        ensClient.getEnsText({ name: normalizedName, key: 'description' }).catch(() => null),
        ensClient.getEnsText({ name: normalizedName, key: 'url' }).catch(() => null),
        ensClient.getEnsText({ name: normalizedName, key: 'com.twitter' }).catch(() => null),
        ensClient.getEnsText({ name: normalizedName, key: 'com.github' }).catch(() => null),
        ensClient.getEnsText({ name: normalizedName, key: 'com.discord' }).catch(() => null),
        ensClient.getEnsText({ name: normalizedName, key: 'email' }).catch(() => null),
        ensClient.getEnsText({ name: normalizedName, key: 'name' }).catch(() => null),
      ]);

    if (!address) {
      console.log('⚠️ Direct ENS: No address resolved for', name);
      return null;
    }

    console.log(`✅ Direct ENS resolved: ${name} -> ${address}`);

    // Build links object from text records
    const links: Record<string, any> = {};
    if (twitter) links.twitter = { link: `https://twitter.com/${twitter}`, handle: twitter };
    if (github) links.github = { link: `https://github.com/${github}`, handle: github };
    if (discord) links.discord = { link: discord, handle: discord };
    if (url) links.website = { link: url };

    return {
      address,
      identity: name,
      platform: 'ens',
      displayName: displayName || name,
      avatar: avatar || null,
      description: description || null,
      header: null,
      website: url || null,
      url: url || null,
      links,
      email: email || null,
      location: null,
    };
  } catch (err: any) {
    console.error('❌ Direct ENS resolution error:', err.message);
    return null;
  }
}

/**
 * Call Web3.bio public API (no API key required)
 * Works for .eth, .sol, .box, wallet addresses, and more
 */
async function fetchWeb3BioProfile(identity: string): Promise<any | null> {
  const url = `https://api.web3.bio/profile/${encodeURIComponent(identity)}`;
  console.log(`🔍 [Client] Fetching Web3.bio profile for: ${identity}`);

  const response = await fetchWithRetry(url, {}, 2, 12000);

  if (!response) {
    console.log('❌ Web3.bio: All retries failed');
    return null;
  }

  if (response.status === 404) {
    console.log('⚠️ Web3.bio: Profile not found (404)');
    return { notFound: true };
  }

  if (!response.ok) {
    console.log(`❌ Web3.bio: HTTP ${response.status}`);
    return null;
  }

  const data = await response.json();

  // Web3.bio returns an array of profiles
  if (Array.isArray(data) && data.length > 0) {
    // Pick the primary profile (ENS > Farcaster > others)
    const platformPriority = ['ens', 'farcaster', 'lens', 'dotbit', 'unstoppabledomains'];
    let primaryProfile = data[0];

    for (const platform of platformPriority) {
      const found = data.find((p: any) => p.platform === platform);
      if (found) {
        primaryProfile = found;
        break;
      }
    }

    // Normalize to our format
    return {
      address: primaryProfile.address,
      identity: primaryProfile.identity,
      platform: primaryProfile.platform,
      displayName: primaryProfile.displayName,
      avatar: primaryProfile.avatar,
      description: primaryProfile.description,
      header: primaryProfile.header,
      website: primaryProfile.links?.website?.link,
      url: primaryProfile.links?.website?.link,
      links: primaryProfile.links,
      location: primaryProfile.location,
      email: primaryProfile.email,
      farcaster: primaryProfile.links?.farcaster,
    };
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }

  return { notFound: true };
}

/**
 * Resolve .iota domain using IOTA Names Mainnet Indexer (public JSON-RPC)
 */
async function fetchIotaProfile(domain: string): Promise<any | null> {
  console.log(`🔍 [Client] Fetching IOTA Names profile for: ${domain}`);

  try {
    // Use the IOTA Names lookup method via JSON-RPC
    const result = await iotaJsonRpc<any>(
      'iotax_iotaNamesLookup',
      [domain],
      'mainnet'
    );

    if (!result || !result.targetAddress) {
      console.log('⚠️ IOTA Names: Domain not found or no target address');
      return null;
    }

    console.log(`✅ IOTA Names resolved: ${domain} -> ${result.targetAddress}`);

    return {
      address: result.targetAddress,
      identity: domain,
      platform: 'iota',
      displayName: domain,
      avatar: null, // IOTA Names may have avatar in NFT metadata
      description: null,
      header: null,
      website: null,
      url: null,
      links: {},
      iotaDomain: domain,
      nftId: result.nftId, // For fetching additional profile data
    };
  } catch (err: any) {
    console.error('❌ IOTA Names fetch error:', err.message);
    return null;
  }
}

/**
 * Reverse resolution for IOTA: address -> primary .iota name
 * Note: iotax_iotaNamesReverseLookup returns a string (the name), not an object
 */
async function fetchIotaReverseProfile(address: string): Promise<any | null> {
  console.log(`🔍 [Client] IOTA reverse lookup for: ${address}`);

  try {
    const result = await iotaJsonRpc<string | null>(
      'iotax_iotaNamesReverseLookup',
      [address.toLowerCase()],
      'mainnet'
    );

    // The API returns just the name string, or null if not found
    if (!result || typeof result !== 'string' || result.trim().length === 0) {
      console.log('⚠️ IOTA reverse: No name found for address');
      return null;
    }

    // Ensure the name ends with .iota
    const iotaDomain = result.endsWith('.iota') ? result : `${result}.iota`;
    console.log(`✅ IOTA reverse resolved: ${address} -> ${iotaDomain}`);

    return {
      iotaDomain,
    };
  } catch (err: any) {
    console.error('❌ IOTA reverse fetch error:', err.message);
    return null;
  }
}

/**
 * Resolve .vet domain using vet.domains public API
 */
async function fetchVetProfile(domain: string): Promise<any | null> {
  console.log(`🔍 [Client] Fetching .vet profile for: ${domain}`);

  try {
    const lookupUrl = `https://vet.domains/api/lookup/name/${encodeURIComponent(domain)}`;
    const response = await fetchWithRetry(lookupUrl, {}, 2, 10000);

    if (!response || !response.ok) {
      console.log(`❌ vet.domains: HTTP ${response?.status || 'failed'}`);
      return null;
    }

    const data = await response.json();

    if (!data.address) {
      console.log('⚠️ vet.domains: Domain not found or no address');
      return null;
    }

    const avatarUrl = `https://vet.domains/api/avatar/${encodeURIComponent(domain)}`;
    console.log(`✅ vet.domains resolved: ${domain} -> ${data.address}`);

    return {
      address: data.address,
      identity: domain,
      platform: 'vechain',
      displayName: domain,
      avatar: avatarUrl,
      description: null,
      header: null,
      website: null,
      url: null,
      links: {},
      vetDomain: domain,
    };
  } catch (err: any) {
    console.error('❌ vet.domains fetch error:', err.message);
    return null;
  }
}

/**
 * Known Unstoppable Domains TLDs
 */
const UD_TLDS = ['.crypto', '.nft', '.x', '.wallet', '.bitcoin', '.dao', '.888', '.zil', '.blockchain', '.go', '.klever', '.hi', '.kresus', '.polygon', '.anime', '.manga', '.binanceus'];

function isUdDomain(name: string): boolean {
  return UD_TLDS.some(tld => name.endsWith(tld));
}

/**
 * Resolve Unstoppable Domain via public resolution API
 */
async function fetchUdProfile(domain: string): Promise<any | null> {
  console.log(`🔍 [Client] Fetching UD profile for: ${domain}`);

  try {
    const res = await fetchWithRetry(
      `https://resolve.unstoppabledomains.com/domains/${encodeURIComponent(domain)}`,
      { headers: { Accept: 'application/json' } },
      2,
      12000
    );

    if (!res || !res.ok) {
      console.log(`❌ UD resolve: HTTP ${res?.status || 'failed'}`);
      return null;
    }

    const data = await res.json();
    const ownerAddress = data?.meta?.owner || data?.records?.['crypto.ETH.address'] || null;

    if (!ownerAddress) {
      console.log('⚠️ UD: Domain not found or no owner');
      return null;
    }

    console.log(`✅ UD resolved: ${domain} -> ${ownerAddress}`);

    const links: Record<string, any> = {};
    const twitter = data?.records?.['social.twitter.username'];
    if (twitter) links.twitter = { link: `https://twitter.com/${twitter}`, handle: twitter };
    const url = data?.records?.['ipfs.redirect_domain.value'] || data?.records?.['browser.redirect_url'];
    if (url) links.website = { link: url };

    return {
      address: ownerAddress,
      identity: domain,
      platform: 'unstoppabledomains',
      displayName: data?.records?.['profile.name'] || domain,
      avatar: data?.records?.['social.picture.value'] || `https://resolve.unstoppabledomains.com/image-src/${domain}`,
      description: data?.records?.['whois.description'] || null,
      header: null,
      website: url || null,
      url: url || null,
      links,
      email: data?.records?.['whois.email.value'] || null,
      location: null,
      udDomain: domain,
    };
  } catch (err: any) {
    console.error('❌ UD fetch error:', err.message);
    return null;
  }
}

/**
 * Reverse resolution for vet.domains: address -> primary name
 */
async function fetchVetReverseProfile(address: string): Promise<any | null> {
  console.log(`🔍 [Client] .vet reverse lookup for: ${address}`);

  try {
    const lookupUrl = `https://vet.domains/api/lookup/address/${encodeURIComponent(address)}`;
    const response = await fetchWithRetry(lookupUrl, {}, 2, 10000);

    if (!response || !response.ok) {
      console.log(`❌ vet.domains reverse: HTTP ${response?.status || 'failed'}`);
      return null;
    }

    const data = await response.json();

    // Only use verified reverse records (anti-spoof protection)
    if (!data.name || data.verified !== true) {
      console.log('⚠️ vet.domains reverse: No verified name found');
      return null;
    }

    const avatarUrl = `https://vet.domains/api/avatar/${encodeURIComponent(data.name)}`;
    console.log(`✅ vet.domains reverse: ${address} -> ${data.name}`);

    return {
      vetDomain: data.name,
      avatar: avatarUrl,
    };
  } catch (err: any) {
    console.error('❌ vet.domains reverse fetch error:', err.message);
    return null;
  }
}

/**
 * Main profile resolution hook - uses public APIs directly from the client
 */
export function useProfileResolver() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolverResult | null>(null);

  const resolveProfile = useCallback(async (identity: string): Promise<ResolverResult> => {
    const normalized = identity.trim().toLowerCase();
    if (!normalized) {
      return { ok: false, source: 'fallback', profile: null, error: 'No identity provided' };
    }

    setLoading(true);
    const startTime = Date.now();
    const debug: { tried: string[]; timingsMs: Record<string, number> } = { tried: [], timingsMs: {} };

    try {
      // Determine identity type
      const isEvmWalletAddress = /^0x[a-fA-F0-9]{40}$/i.test(normalized);
      const isIotaWalletAddress = isValidIotaAddress(normalized);
      const isWalletAddress = isEvmWalletAddress || isIotaWalletAddress;
      const isVetDomain = normalized.endsWith('.vet');
      const isIotaDomain = normalized.endsWith('.iota');

      const isEthDomain = normalized.endsWith('.eth') && !normalized.endsWith('.base.eth');
      const isBoxDomain = /\.box$/i.test(normalized);

      // Web3.bio-compatible TLDs (public API) — .eth handled separately via direct resolution
      const web3BioTLDs = ['.box', '.sol', '.world.id', '.base.eth'];
      const isWeb3BioCompatible = web3BioTLDs.some((tld) => normalized.endsWith(tld));

      const isUd = isUdDomain(normalized);

      let resolverResult: ResolverResult = { ok: false, source: 'fallback', profile: null };

      // Route 0: Unstoppable Domains TLDs
      if (isUd) {
        debug.tried.push('ud');
        const udStart = Date.now();
        const udProfile = await fetchUdProfile(normalized);
        debug.timingsMs.ud = Date.now() - udStart;

        if (udProfile) {
          // Enrich with Web3.bio if we have an address
          if (udProfile.address) {
            debug.tried.push('web3bio');
            const w3Start = Date.now();
            const web3Profile = await fetchWeb3BioProfile(udProfile.address);
            debug.timingsMs.web3bio = Date.now() - w3Start;

            if (web3Profile && !web3Profile.notFound) {
              resolverResult = {
                ok: true,
                source: 'ud',
                profile: {
                  ...web3Profile,
                  udDomain: udProfile.udDomain,
                  avatar: udProfile.avatar || web3Profile.avatar,
                  displayName: udProfile.displayName || web3Profile.displayName,
                },
              };
            } else {
              resolverResult = { ok: true, source: 'ud', profile: udProfile };
            }
          } else {
            resolverResult = { ok: true, source: 'ud', profile: udProfile };
          }
        } else {
          resolverResult = { ok: false, source: 'ud', profile: null, notFound: true };
        }
      }
      // Route 1: .iota domains — skip Web3.bio for instant loading
      else if (isIotaDomain) {
        debug.tried.push('iota');
        const iotaStart = Date.now();
        const iotaProfile = await fetchIotaProfile(normalized);
        debug.timingsMs.iota = Date.now() - iotaStart;

        if (iotaProfile) {
          resolverResult = { ok: true, source: 'iota', profile: iotaProfile };
        } else {
          resolverResult = { ok: false, source: 'iota', profile: null, notFound: true };
        }
      }
      // Route 2: .vet domains
      else if (isVetDomain) {
        debug.tried.push('vet');
        const vetStart = Date.now();
        const vetProfile = await fetchVetProfile(normalized);
        debug.timingsMs.vet = Date.now() - vetStart;

        if (vetProfile) {
          // Enrich with Web3.bio
          if (vetProfile.address) {
            debug.tried.push('web3bio');
            const w3Start = Date.now();
            const web3Profile = await fetchWeb3BioProfile(vetProfile.address);
            debug.timingsMs.web3bio = Date.now() - w3Start;

            if (web3Profile && !web3Profile.notFound) {
              resolverResult = {
                ok: true,
                source: 'vet',
                profile: {
                  ...web3Profile,
                  vetDomain: vetProfile.vetDomain,
                  avatar: vetProfile.avatar || web3Profile.avatar,
                },
              };
            } else {
              resolverResult = { ok: true, source: 'vet', profile: vetProfile };
            }
          } else {
            resolverResult = { ok: true, source: 'vet', profile: vetProfile };
          }
        } else {
          resolverResult = { ok: false, source: 'vet', profile: null, notFound: true };
        }
      }
      // Route 3: .eth domains — direct ENS resolution via viem, web3.bio as fallback
      else if (isEthDomain) {
        debug.tried.push('ens-direct');
        const ensStart = Date.now();
        const ensProfile = await fetchEnsDirectProfile(normalized);
        debug.timingsMs.ensDirect = Date.now() - ensStart;

        if (ensProfile) {
          resolverResult = { ok: true, source: 'web3bio', profile: ensProfile };
        } else {
          // Fallback to web3.bio
          debug.tried.push('web3bio');
          const w3Start = Date.now();
          const web3Profile = await fetchWeb3BioProfile(normalized);
          debug.timingsMs.web3bio = Date.now() - w3Start;

          if (web3Profile && !web3Profile.notFound) {
            resolverResult = { ok: true, source: 'web3bio', profile: web3Profile };
          } else {
            resolverResult = { ok: false, source: 'web3bio', profile: null, notFound: true };
          }
        }
      }
      // Route 4: Web3.bio-compatible TLDs (.box, .sol, etc.) and wallet addresses
      else if (isWeb3BioCompatible || isWalletAddress) {
        debug.tried.push('web3bio');
        const w3Start = Date.now();
        const web3Profile = await fetchWeb3BioProfile(normalized);
        debug.timingsMs.web3bio = Date.now() - w3Start;

        if (web3Profile && !web3Profile.notFound) {
          // For EVM wallet addresses, try .vet reverse
          if (isEvmWalletAddress) {
            debug.tried.push('vet-reverse');
            const vetStart = Date.now();
            const vetReverse = await fetchVetReverseProfile(normalized);
            debug.timingsMs.vetReverse = Date.now() - vetStart;

            if (vetReverse?.vetDomain) {
              resolverResult = {
                ok: true,
                source: 'web3bio',
                profile: {
                  ...web3Profile,
                  vetDomain: vetReverse.vetDomain,
                  avatar: web3Profile.avatar || vetReverse.avatar,
                },
              };
            } else {
              resolverResult = { ok: true, source: 'web3bio', profile: web3Profile };
            }
          } else {
            resolverResult = { ok: true, source: 'web3bio', profile: web3Profile };
          }
        }
        // For IOTA wallet addresses, try reverse lookup
        else if (isIotaWalletAddress) {
          debug.tried.push('iota-reverse');
          const iotaStart = Date.now();
          const iotaReverse = await fetchIotaReverseProfile(normalized);
          debug.timingsMs.iotaReverse = Date.now() - iotaStart;

          if (iotaReverse?.iotaDomain) {
            // Fetch full IOTA profile for the resolved domain
            debug.tried.push('iota');
            const iotaProfileStart = Date.now();
            const iotaProfile = await fetchIotaProfile(iotaReverse.iotaDomain);
            debug.timingsMs.iota = Date.now() - iotaProfileStart;

            if (iotaProfile) {
              resolverResult = {
                ok: true,
                source: 'iota',
                profile: {
                  ...iotaProfile,
                  address: normalized,
                  iotaDomain: iotaReverse.iotaDomain,
                },
              };
            } else {
              resolverResult = {
                ok: true,
                source: 'iota',
                profile: {
                  address: normalized,
                  identity: iotaReverse.iotaDomain,
                  platform: 'iota',
                  displayName: iotaReverse.iotaDomain,
                  avatar: null,
                  description: null,
                  header: null,
                  website: null,
                  url: null,
                  links: {},
                  iotaDomain: iotaReverse.iotaDomain,
                },
              };
            }
          } else {
            // Create minimal IOTA wallet profile
            resolverResult = {
              ok: true,
              source: 'fallback',
              profile: {
                address: normalized,
                identity: normalized,
                platform: 'iota',
                displayName: null,
                avatar: null,
                description: null,
                header: null,
                website: null,
                url: null,
                links: {},
              },
            };
          }
        }
        // For EVM wallet addresses without Web3.bio data
        else if (isEvmWalletAddress) {
          debug.tried.push('vet-reverse');
          const vetStart = Date.now();
          const vetReverse = await fetchVetReverseProfile(normalized);
          debug.timingsMs.vetReverse = Date.now() - vetStart;

          if (vetReverse?.vetDomain) {
            resolverResult = {
              ok: true,
              source: 'vet',
              profile: {
                address: normalized,
                identity: vetReverse.vetDomain,
                platform: 'vechain',
                displayName: vetReverse.vetDomain,
                avatar: vetReverse.avatar,
                description: null,
                header: null,
                website: null,
                url: null,
                links: {},
                vetDomain: vetReverse.vetDomain,
              },
            };
          } else {
            // Create minimal wallet profile
            resolverResult = {
              ok: true,
              source: 'fallback',
              profile: {
                address: normalized,
                identity: normalized,
                platform: 'ethereum',
                displayName: null,
                avatar: null,
                description: null,
                header: null,
                website: null,
                url: null,
                links: {},
              },
            };
          }
        } else {
          resolverResult = { ok: false, source: 'web3bio', profile: null, notFound: true };
        }
      }
      // Route 4: Unknown format - try Web3.bio as a catch-all
      else {
        debug.tried.push('web3bio');
        const w3Start = Date.now();
        const web3Profile = await fetchWeb3BioProfile(normalized);
        debug.timingsMs.web3bio = Date.now() - w3Start;

        if (web3Profile && !web3Profile.notFound) {
          resolverResult = { ok: true, source: 'web3bio', profile: web3Profile };
        } else {
          resolverResult = { ok: false, source: 'web3bio', profile: null, notFound: true };
        }
      }

      debug.timingsMs.total = Date.now() - startTime;
      resolverResult.debug = debug;

      console.log(
        `✅ [Client] Profile resolved in ${debug.timingsMs.total}ms. Source: ${resolverResult.source}, OK: ${resolverResult.ok}`
      );

      setResult(resolverResult);
      return resolverResult;
    } catch (err: any) {
      console.error('❌ [Client] Profile resolution error:', err);
      const errorResult: ResolverResult = {
        ok: false,
        source: 'fallback',
        profile: null,
        error: err.message || 'Internal error',
        debug: { tried: debug.tried, timingsMs: { ...debug.timingsMs, total: Date.now() - startTime } },
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setLoading(false);
  }, []);

  return {
    loading,
    result,
    resolveProfile,
    reset,
  };
}

/**
 * Standalone function for direct profile resolution (no React state)
 * Can be imported and called directly without using the hook
 */
export async function resolveProfileDirect(identity: string): Promise<ResolverResult> {
  const normalized = identity.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, source: 'fallback', profile: null, error: 'No identity provided' };
  }

  const startTime = Date.now();
  const debug: { tried: string[]; timingsMs: Record<string, number> } = { tried: [], timingsMs: {} };

  try {
    // Determine identity type
    const isEvmWalletAddress = /^0x[a-fA-F0-9]{40}$/i.test(normalized);
    const isIotaWalletAddress = isValidIotaAddress(normalized);
    const isWalletAddress = isEvmWalletAddress || isIotaWalletAddress;
    const isVetDomain = normalized.endsWith('.vet');
    const isIotaDomain = normalized.endsWith('.iota');

    const isEthDomain = normalized.endsWith('.eth') && !normalized.endsWith('.base.eth');
    const isBoxDomain = /\.box$/i.test(normalized);

    // Web3.bio-compatible TLDs (public API) — .eth handled separately via direct resolution
    const web3BioTLDs = ['.box', '.sol', '.world.id', '.base.eth'];
    const isWeb3BioCompatible = web3BioTLDs.some((tld) => normalized.endsWith(tld));

    const isUd = isUdDomain(normalized);

    let resolverResult: ResolverResult = { ok: false, source: 'fallback', profile: null };

    // Route 0: Unstoppable Domains TLDs
    if (isUd) {
      debug.tried.push('ud');
      const udStart = Date.now();
      const udProfile = await fetchUdProfile(normalized);
      debug.timingsMs.ud = Date.now() - udStart;

      if (udProfile) {
        if (udProfile.address) {
          debug.tried.push('web3bio');
          const w3Start = Date.now();
          const web3Profile = await fetchWeb3BioProfile(udProfile.address);
          debug.timingsMs.web3bio = Date.now() - w3Start;

          if (web3Profile && !web3Profile.notFound) {
            resolverResult = {
              ok: true,
              source: 'ud',
              profile: {
                ...web3Profile,
                udDomain: udProfile.udDomain,
                avatar: udProfile.avatar || web3Profile.avatar,
                displayName: udProfile.displayName || web3Profile.displayName,
              },
            };
          } else {
            resolverResult = { ok: true, source: 'ud', profile: udProfile };
          }
        } else {
          resolverResult = { ok: true, source: 'ud', profile: udProfile };
        }
      } else {
        resolverResult = { ok: false, source: 'ud', profile: null, notFound: true };
      }
    }
    // Route 1: .iota domains — skip Web3.bio for instant loading
    else if (isIotaDomain) {
      debug.tried.push('iota');
      const iotaStart = Date.now();
      const iotaProfile = await fetchIotaProfile(normalized);
      debug.timingsMs.iota = Date.now() - iotaStart;

      if (iotaProfile) {
        // Return immediately — onchain IPFS profile data will be loaded in parallel by the UI
        resolverResult = { ok: true, source: 'iota', profile: iotaProfile };
      } else {
        resolverResult = { ok: false, source: 'iota', profile: null, notFound: true };
      }
    }
    // Route 2: .vet domains
    else if (isVetDomain) {
      debug.tried.push('vet');
      const vetStart = Date.now();
      const vetProfile = await fetchVetProfile(normalized);
      debug.timingsMs.vet = Date.now() - vetStart;

      if (vetProfile) {
        // Enrich with Web3.bio
        if (vetProfile.address) {
          debug.tried.push('web3bio');
          const w3Start = Date.now();
          const web3Profile = await fetchWeb3BioProfile(vetProfile.address);
          debug.timingsMs.web3bio = Date.now() - w3Start;

          if (web3Profile && !web3Profile.notFound) {
            resolverResult = {
              ok: true,
              source: 'vet',
              profile: {
                ...web3Profile,
                vetDomain: vetProfile.vetDomain,
                avatar: vetProfile.avatar || web3Profile.avatar,
              },
            };
          } else {
            resolverResult = { ok: true, source: 'vet', profile: vetProfile };
          }
        } else {
          resolverResult = { ok: true, source: 'vet', profile: vetProfile };
        }
      } else {
        resolverResult = { ok: false, source: 'vet', profile: null, notFound: true };
      }
    }
    // Route 3: .eth domains — direct ENS resolution via viem, web3.bio as fallback
    else if (isEthDomain) {
      debug.tried.push('ens-direct');
      const ensStart = Date.now();
      const ensProfile = await fetchEnsDirectProfile(normalized);
      debug.timingsMs.ensDirect = Date.now() - ensStart;

      if (ensProfile) {
        resolverResult = { ok: true, source: 'web3bio', profile: ensProfile };
      } else {
        // Fallback to web3.bio
        debug.tried.push('web3bio');
        const w3Start = Date.now();
        const web3Profile = await fetchWeb3BioProfile(normalized);
        debug.timingsMs.web3bio = Date.now() - w3Start;

        if (web3Profile && !web3Profile.notFound) {
          resolverResult = { ok: true, source: 'web3bio', profile: web3Profile };
        } else {
          resolverResult = { ok: false, source: 'web3bio', profile: null, notFound: true };
        }
      }
    }
    // Route 4: Web3.bio-compatible TLDs (.box, .sol, etc.) and wallet addresses
    else if (isWeb3BioCompatible || isWalletAddress) {
      debug.tried.push('web3bio');
      const w3Start = Date.now();
      const web3Profile = await fetchWeb3BioProfile(normalized);
      debug.timingsMs.web3bio = Date.now() - w3Start;

      if (web3Profile && !web3Profile.notFound) {
        // For EVM wallet addresses, try .vet reverse
        if (isEvmWalletAddress) {
          debug.tried.push('vet-reverse');
          const vetStart = Date.now();
          const vetReverse = await fetchVetReverseProfile(normalized);
          debug.timingsMs.vetReverse = Date.now() - vetStart;

          if (vetReverse?.vetDomain) {
            resolverResult = {
              ok: true,
              source: 'web3bio',
              profile: {
                ...web3Profile,
                vetDomain: vetReverse.vetDomain,
                avatar: web3Profile.avatar || vetReverse.avatar,
              },
            };
          } else {
            resolverResult = { ok: true, source: 'web3bio', profile: web3Profile };
          }
        } else {
          resolverResult = { ok: true, source: 'web3bio', profile: web3Profile };
        }
      }
      // For IOTA wallet addresses, try reverse lookup
      else if (isIotaWalletAddress) {
        debug.tried.push('iota-reverse');
        const iotaStart = Date.now();
        const iotaReverse = await fetchIotaReverseProfile(normalized);
        debug.timingsMs.iotaReverse = Date.now() - iotaStart;

        if (iotaReverse?.iotaDomain) {
          // Fetch full IOTA profile for the resolved domain
          debug.tried.push('iota');
          const iotaProfileStart = Date.now();
          const iotaProfile = await fetchIotaProfile(iotaReverse.iotaDomain);
          debug.timingsMs.iota = Date.now() - iotaProfileStart;

          if (iotaProfile) {
            resolverResult = {
              ok: true,
              source: 'iota',
              profile: {
                ...iotaProfile,
                address: normalized,
                iotaDomain: iotaReverse.iotaDomain,
              },
            };
          } else {
            resolverResult = {
              ok: true,
              source: 'iota',
              profile: {
                address: normalized,
                identity: iotaReverse.iotaDomain,
                platform: 'iota',
                displayName: iotaReverse.iotaDomain,
                avatar: null,
                description: null,
                header: null,
                website: null,
                url: null,
                links: {},
                iotaDomain: iotaReverse.iotaDomain,
              },
            };
          }
        } else {
          // Create minimal IOTA wallet profile
          resolverResult = {
            ok: true,
            source: 'fallback',
            profile: {
              address: normalized,
              identity: normalized,
              platform: 'iota',
              displayName: null,
              avatar: null,
              description: null,
              header: null,
              website: null,
              url: null,
              links: {},
            },
          };
        }
      }
      // For EVM wallet addresses without Web3.bio data
      else if (isEvmWalletAddress) {
        debug.tried.push('vet-reverse');
        const vetStart = Date.now();
        const vetReverse = await fetchVetReverseProfile(normalized);
        debug.timingsMs.vetReverse = Date.now() - vetStart;

        if (vetReverse?.vetDomain) {
          resolverResult = {
            ok: true,
            source: 'vet',
            profile: {
              address: normalized,
              identity: vetReverse.vetDomain,
              platform: 'vechain',
              displayName: vetReverse.vetDomain,
              avatar: vetReverse.avatar,
              description: null,
              header: null,
              website: null,
              url: null,
              links: {},
              vetDomain: vetReverse.vetDomain,
            },
          };
        } else {
          // Create minimal wallet profile
          resolverResult = {
            ok: true,
            source: 'fallback',
            profile: {
              address: normalized,
              identity: normalized,
              platform: 'ethereum',
              displayName: null,
              avatar: null,
              description: null,
              header: null,
              website: null,
              url: null,
              links: {},
            },
          };
        }
      } else {
        resolverResult = { ok: false, source: 'web3bio', profile: null, notFound: true };
      }
    }
    // Route 4: Unknown format - try Web3.bio as a catch-all
    else {
      debug.tried.push('web3bio');
      const w3Start = Date.now();
      const web3Profile = await fetchWeb3BioProfile(normalized);
      debug.timingsMs.web3bio = Date.now() - w3Start;

      if (web3Profile && !web3Profile.notFound) {
        resolverResult = { ok: true, source: 'web3bio', profile: web3Profile };
      } else {
        resolverResult = { ok: false, source: 'web3bio', profile: null, notFound: true };
      }
    }

    debug.timingsMs.total = Date.now() - startTime;
    resolverResult.debug = debug;

    console.log(
      `✅ [Client] Profile resolved in ${debug.timingsMs.total}ms. Source: ${resolverResult.source}, OK: ${resolverResult.ok}`
    );

    return resolverResult;
  } catch (err: any) {
    console.error('❌ [Client] Profile resolution error:', err);
    return {
      ok: false,
      source: 'fallback',
      profile: null,
      error: err.message || 'Internal error',
      debug: { tried: debug.tried, timingsMs: { ...debug.timingsMs, total: Date.now() - startTime } },
    };
  }
}
