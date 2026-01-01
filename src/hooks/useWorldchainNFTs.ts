import { useState, useEffect, useCallback } from 'react';

const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_KEY || '';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface NFTMedia {
  thumbnail?: string;
  gateway?: string;
  raw?: string;
}

interface NFTMetadata {
  image?: string;
  name?: string;
  description?: string;
}

interface NFTContract {
  address: string;
  name?: string;
  symbol?: string;
}

export interface WorldchainNFT {
  contract: NFTContract;
  tokenId: string;
  name?: string;
  description?: string;
  media: NFTMedia[];
  metadata?: NFTMetadata;
  tokenType: string;
}

export interface NFTCollection {
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

const resolveIpfsUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  return url;
};

const getNFTThumbnail = (nft: WorldchainNFT): string => {
  // Priority: media thumbnail > media gateway > metadata image
  if (nft.media?.[0]?.thumbnail) {
    return nft.media[0].thumbnail;
  }
  if (nft.media?.[0]?.gateway) {
    return nft.media[0].gateway;
  }
  if (nft.metadata?.image) {
    return resolveIpfsUrl(nft.metadata.image);
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

export const groupNFTsByCollection = (nfts: WorldchainNFT[]): NFTCollection[] => {
  const collectionMap = new Map<string, WorldchainNFT[]>();
  
  nfts.forEach(nft => {
    const address = nft.contract.address.toLowerCase();
    if (!collectionMap.has(address)) {
      collectionMap.set(address, []);
    }
    collectionMap.get(address)!.push(nft);
  });

  return Array.from(collectionMap.entries()).map(([contractAddress, nfts]) => ({
    contractAddress,
    name: nfts[0]?.contract?.name || 'Unknown Collection',
    coverImage: getNFTThumbnail(nfts[0]),
    nftCount: nfts.length,
    nfts,
  }));
};

export const useWorldchainNFTs = (walletAddress?: string) => {
  const [nfts, setNfts] = useState<WorldchainNFT[]>([]);
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = useCallback(async (address: string) => {
    if (!ALCHEMY_API_KEY) {
      console.warn('[useWorldchainNFTs] No API key configured');
      setError('Alchemy API key not configured');
      return;
    }

    // Check cache first
    const cached = getFromCache(address);
    if (cached) {
      console.log('[useWorldchainNFTs] Using cached data');
      setNfts(cached);
      setCollections(groupNFTsByCollection(cached));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `https://worldchain-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${address}&withMetadata=true`;
      console.log('[useWorldchainNFTs] Fetching NFTs for:', address, 'URL:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alchemy API error: ${response.status}`);
      }

      const data = await response.json();
      const ownedNfts: WorldchainNFT[] = data.ownedNfts || [];
      
      console.log('[useWorldchainNFTs] Fetched NFTs:', ownedNfts.length);

      setToCache(address, ownedNfts);
      setNfts(ownedNfts);
      setCollections(groupNFTsByCollection(ownedNfts));
    } catch (err: any) {
      console.error('[useWorldchainNFTs] Error:', err);
      setError(err?.message || 'Failed to fetch NFTs');
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
      fetchNFTs(walletAddress);
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

export { getNFTThumbnail };
