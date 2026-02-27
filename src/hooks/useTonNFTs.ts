import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface TonNFT {
  address: string;
  index: number;
  name: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  collection: string;
  collection_address: string;
  verified: boolean;
  trust: string;
  attributes: any[];
}

export interface TonNFTCollectionGroup {
  collectionName: string;
  collectionAddress: string;
  coverImage: string;
  nftCount: number;
  nfts: TonNFT[];
}

interface CacheEntry {
  data: TonNFT[];
  timestamp: number;
}

const getCacheKey = (address: string) => `ton-nfts-${address.toLowerCase()}`;

const getFromCache = (address: string): TonNFT[] | null => {
  try {
    const cached = localStorage.getItem(getCacheKey(address));
    if (!cached) return null;
    const entry: CacheEntry = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(address));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
};

const setToCache = (address: string, data: TonNFT[]) => {
  try {
    localStorage.setItem(getCacheKey(address), JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
};

export const groupTonNFTsByCollection = (nfts: TonNFT[]): TonNFTCollectionGroup[] => {
  const map = new Map<string, TonNFT[]>();
  nfts.forEach((nft) => {
    const key = nft.collection || 'Uncategorized';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(nft);
  });

  return Array.from(map.entries()).map(([collectionName, nfts]) => ({
    collectionName,
    collectionAddress: nfts[0]?.collection_address || '',
    coverImage: nfts[0]?.image_url || nfts[0]?.thumbnail_url || '',
    nftCount: nfts.length,
    nfts,
  }));
};

export const useTonNFTs = (walletAddress?: string | null) => {
  const [nfts, setNfts] = useState<TonNFT[]>([]);
  const [collections, setCollections] = useState<TonNFTCollectionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchNFTs = useCallback(async (address: string, skipCache = false) => {
    if (!skipCache) {
      const cached = getFromCache(address);
      if (cached) {
        setNfts(cached);
        setCollections(groupTonNFTsByCollection(cached));
        setFetched(true);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useTonNFTs] Fetching TON NFTs for:', address);

      const { data, error: fnError } = await supabase.functions.invoke('get-ton-nfts', {
        body: { walletAddress: address },
      });

      if (fnError) {
        console.error('[useTonNFTs] Edge function error:', fnError);
        throw new Error('Failed to fetch TON NFTs');
      }

      const items: TonNFT[] = (data?.nfts as TonNFT[]) || [];
      console.log('[useTonNFTs] Found', items.length, 'TON NFTs');

      setToCache(address, items);
      setNfts(items);
      setCollections(groupTonNFTsByCollection(items));
    } catch (err: unknown) {
      console.error('[useTonNFTs] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch TON NFTs');
      setNfts([]);
      setCollections([]);
    } finally {
      setIsLoading(false);
      setFetched(true);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchNFTs(walletAddress);
    } else {
      setNfts([]);
      setCollections([]);
      setFetched(false);
    }
  }, [walletAddress, fetchNFTs]);

  const refetch = useCallback(() => {
    if (walletAddress) {
      localStorage.removeItem(getCacheKey(walletAddress));
      fetchNFTs(walletAddress, true);
    }
  }, [walletAddress, fetchNFTs]);

  return { nfts, collections, isLoading, error, fetched, refetch };
};
