import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface TonToken {
  id: string;
  chain: string;
  name: string;
  symbol: string;
  icon: string;
  quantity: number;
  value: number;
  decimals: number;
  verified?: boolean;
}

interface CacheEntry {
  tokens: TonToken[];
  totalValue: number;
  timestamp: number;
}

const getCacheKey = (address: string) => `ton-tokens-${address.toLowerCase()}`;

const getFromCache = (address: string): CacheEntry | null => {
  try {
    const cached = localStorage.getItem(getCacheKey(address));
    if (!cached) return null;
    const entry: CacheEntry = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(address));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
};

const setToCache = (address: string, tokens: TonToken[], totalValue: number) => {
  try {
    localStorage.setItem(getCacheKey(address), JSON.stringify({ tokens, totalValue, timestamp: Date.now() }));
  } catch {}
};

export const useTonTokens = (walletAddress?: string | null) => {
  const [tokens, setTokens] = useState<TonToken[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchTokens = useCallback(async (address: string, skipCache = false) => {
    if (!skipCache) {
      const cached = getFromCache(address);
      if (cached) {
        setTokens(cached.tokens);
        setTotalValue(cached.totalValue);
        setFetched(true);
        return;
      }
    }

    setIsLoading(true);

    try {
      console.log('[useTonTokens] Fetching TON tokens for:', address);

      const { data, error } = await supabase.functions.invoke('get-ton-tokens', {
        body: { walletAddress: address },
      });

      if (error) {
        console.error('[useTonTokens] Edge function error:', error);
        throw error;
      }

      const items: TonToken[] = (data?.tokens as TonToken[]) || [];
      const total = data?.totalValue || 0;
      console.log('[useTonTokens] Found', items.length, 'TON tokens, total: $' + total.toFixed(2));

      setToCache(address, items, total);
      setTokens(items);
      setTotalValue(total);
    } catch (err) {
      console.error('[useTonTokens] Error:', err);
      setTokens([]);
      setTotalValue(0);
    } finally {
      setIsLoading(false);
      setFetched(true);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchTokens(walletAddress);
    } else {
      setTokens([]);
      setTotalValue(0);
      setFetched(false);
    }
  }, [walletAddress, fetchTokens]);

  return { tokens, totalValue, isLoading, fetched };
};
