import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Alchemy v3 API response types for World Chain
interface NFTImage {
  cachedUrl?: string | null;
  thumbnailUrl?: string | null;
  pngUrl?: string | null;
  contentType?: string | null;
  size?: number | null;
  originalUrl?: string | null;
}

interface NFTContract {
  address: string;
  name?: string | null;
  symbol?: string | null;
  totalSupply?: string | null;
  tokenType?: string;
  isSpam?: boolean;
  openSeaMetadata?: {
    collectionName?: string | null;
    imageUrl?: string | null;
  };
}

interface NFTCollection {
  name?: string | null;
  slug?: string | null;
}

interface NFTRaw {
  tokenUri?: string | null;
  metadata?: {
    image?: string;
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
}

export interface WorldchainNFT {
  contract: NFTContract;
  tokenId: string;
  name?: string | null;
  description?: string | null;
  image: NFTImage;
  raw?: NFTRaw;
  collection?: NFTCollection | null;
  tokenType?: string;
  balance?: string;
}

export interface NFTCollectionGroup {
  contractAddress: string;
  name: string;
  coverImage: string;
  nftCount: number;
  nfts: WorldchainNFT[];
}

interface CacheEntry {
  data: WorldchainNFT[];
  timestamp: number;
}

const resolveIpfsUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  return url;
};

// Get thumbnail based on Alchemy v3 response structure: image.cachedUrl, image.thumbnailUrl, etc.
export const getNFTThumbnail = (nft: WorldchainNFT): string => {
  // Priority based on Alchemy v3 API structure
  if (nft.image?.cachedUrl) return nft.image.cachedUrl;
  if (nft.image?.thumbnailUrl) return nft.image.thumbnailUrl;
  if (nft.image?.pngUrl) return nft.image.pngUrl;
  if (nft.image?.originalUrl) return resolveIpfsUrl(nft.image.originalUrl);
  
  // Fallback to raw metadata image
  if (nft.raw?.metadata?.image) {
    return resolveIpfsUrl(nft.raw.metadata.image);
  }
  
  return '';
};

const getCacheKey = (walletAddress: string) => `wc-nfts-${walletAddress.toLowerCase()}`;

const getFromCache = (walletAddress: string): WorldchainNFT[] | null => {
  try {
    const key = getCacheKey(walletAddress);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
};

const setToCache = (walletAddress: string, data: WorldchainNFT[]) => {
  try {
    const key = getCacheKey(walletAddress);
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('[useWorldchainNFTs] Failed to cache:', e);
  }
};

export const groupNFTsByCollection = (nfts: WorldchainNFT[]): NFTCollectionGroup[] => {
  const collectionMap = new Map<string, WorldchainNFT[]>();
  
  nfts.forEach(nft => {
    const address = nft.contract.address.toLowerCase();
    if (!collectionMap.has(address)) {
      collectionMap.set(address, []);
    }
    collectionMap.get(address)!.push(nft);
  });

  return Array.from(collectionMap.entries()).map(([contractAddress, nfts]) => {
    // Get collection name from various sources
    const collectionName = 
      nfts[0]?.contract?.name ||
      nfts[0]?.collection?.name ||
      nfts[0]?.contract?.openSeaMetadata?.collectionName ||
      'Unknown Collection';
    
    return {
      contractAddress,
      name: collectionName,
      coverImage: getNFTThumbnail(nfts[0]),
      nftCount: nfts.length,
      nfts,
    };
  });
};

// Helper to validate EVM address format (40 hex chars after 0x)
const isValidEvmAddress = (address?: string): boolean => {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/i.test(address);
};

export const useWorldchainNFTs = (walletAddress?: string) => {
  const [nfts, setNfts] = useState<WorldchainNFT[]>([]);
  const [collections, setCollections] = useState<NFTCollectionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = useCallback(async (address: string, skipCache = false) => {
    // Skip API call for non-EVM addresses (like IOTA addresses which are 64 hex chars)
    if (!isValidEvmAddress(address)) {
      console.log('[useWorldchainNFTs] Skipping - not a valid EVM address:', address);
      setNfts([]);
      setCollections([]);
      return;
    }

    // Check cache first
    if (!skipCache) {
      const cached = getFromCache(address);
      if (cached) {
        console.log('[useWorldchainNFTs] Using cached data');
        setNfts(cached);
        setCollections(groupNFTsByCollection(cached));
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useWorldchainNFTs] Fetching World Chain NFTs for:', address);

      const { data, error: fnError } = await supabase.functions.invoke('get-worldchain-nfts', {
        body: { walletAddress: address, pageSize: 100 },
      });

      if (fnError) {
        console.error('[useWorldchainNFTs] Edge function error:', fnError);
        throw new Error('Failed to fetch World Chain NFTs');
      }

      const ownedNfts: WorldchainNFT[] = (data?.ownedNfts as WorldchainNFT[]) || [];

      // Filter out spam NFTs
      const validNfts = ownedNfts.filter((nft) => !nft.contract?.isSpam);

      console.log('[useWorldchainNFTs] Found', validNfts.length, 'valid NFTs');

      setToCache(address, validNfts);
      setNfts(validNfts);
      setCollections(groupNFTsByCollection(validNfts));
    } catch (err: unknown) {
      console.error('[useWorldchainNFTs] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch NFTs';
      setError(errorMessage);
      setNfts([]);
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchNFTs(walletAddress);
    } else {
      setNfts([]);
      setCollections([]);
    }
  }, [walletAddress, fetchNFTs]);

  const refetch = useCallback(() => {
    if (walletAddress) {
      // Clear cache and refetch
      localStorage.removeItem(getCacheKey(walletAddress));
      fetchNFTs(walletAddress, true);
    }
  }, [walletAddress, fetchNFTs]);

  return {
    nfts,
    collections,
    isLoading,
    error,
    refetch,
    getNFTThumbnail,
  };
};

// Re-export for use in components
export type { NFTCollectionGroup as NFTCollection };
