import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPA_URL = "https://gdjjboorqviobvvygpca.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE";

export interface PolymarketPosition {
  market: string;
  outcome: string;
  shares: number;
  value: number;
  avgPrice: number;
  icon?: string;
  status: 'Open' | 'Closed';
  profit: number;
  percentPnl: number;
  conditionId?: string;
  createdAt?: string;
}

export interface ClosedPosition {
  market: string;
  outcome: string;
  realizedPnl: number;
  percentPnl: number;
  size: number;
  avgPrice: number;
  icon?: string;
  settledAt?: string;
  conditionId?: string;
}

export interface PolymarketStats {
  profitUsd: number;
  winRate: number | null;
  openPositionsCount: number;
  closedPositionsCount: number;
  totalTrades: number;
}

export interface PolymarketProfile {
  avatar?: string;
  displayName?: string;
  joinedDate?: string;
}

export interface PolymarketData {
  ok: boolean;
  effectiveAddress: string;
  usedOverride: boolean;
  positions: PolymarketPosition[];
  closedPositions: ClosedPosition[];
  stats: PolymarketStats;
  topPositions: ClosedPosition[];
  profile?: PolymarketProfile;
  // Backwards compatibility
  totalValue?: number;
  winRate?: number | null;
  openPositions?: PolymarketPosition[];
  totalTrades?: number;
  profit?: number;
  noData?: boolean;
}

interface UsePolymarketStatsResult {
  data: PolymarketData | null;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  overrideAddress: string | null;
  refetch: () => Promise<void>;
  setOverrideAddress: (address: string) => Promise<{ success: boolean; error?: string }>;
  clearOverrideAddress: () => Promise<{ success: boolean; error?: string }>;
}

export function usePolymarketStats(walletAddress: string | undefined): UsePolymarketStatsResult {
  const [data, setData] = useState<PolymarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideAddress, setOverrideAddressState] = useState<string | null>(null);

  const fetchOverride = useCallback(async () => {
    if (!walletAddress) return null;

    try {
      const { data: overrideData, error: fetchError } = await supabase
        .from('polymarket_profile_overrides')
        .select('polymarket_profile_address')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle();

      if (fetchError) {
        console.log('[usePolymarketStats] Error fetching override:', fetchError);
        return null;
      }

      return overrideData?.polymarket_profile_address || null;
    } catch (err) {
      console.log('[usePolymarketStats] Override fetch error:', err);
      return null;
    }
  }, [walletAddress]);

  const fetchData = useCallback(async () => {
    if (!walletAddress) {
      setData(null);
      setLoading(false);
      return;
    }

    // Polymarket only supports EVM addresses — skip non-EVM (e.g. IOTA 66-char hex)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, check for override in DB
      const dbOverride = await fetchOverride();
      setOverrideAddressState(dbOverride);

      // Call edge function
      const res = await fetch(`${SUPA_URL}/functions/v1/get-polymarket-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPA_ANON}`,
        },
        body: JSON.stringify({
          walletAddress,
          polymarketProfileAddress: dbOverride || undefined,
          limit: 100,
          maxPages: 5,
        }),
      });

      const result = await res.json();
      console.log('[usePolymarketStats] Response:', result);

      if (result?.error && !result?.ok) {
        setError(result.error);
        setData(null);
      } else {
        setData(result as PolymarketData);
      }
    } catch (err) {
      console.error('[usePolymarketStats] Error:', err);
      setError('Failed to fetch Polymarket data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, fetchOverride]);

  const setOverrideAddress = useCallback(async (address: string): Promise<{ success: boolean; error?: string }> => {
    if (!walletAddress) {
      return { success: false, error: 'No wallet address' };
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { success: false, error: 'Invalid address format' };
    }

    try {
      const { error: upsertError } = await supabase
        .from('polymarket_profile_overrides')
        .upsert({
          wallet_address: walletAddress.toLowerCase(),
          polymarket_profile_address: address.toLowerCase(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'wallet_address',
        });

      if (upsertError) {
        console.error('[usePolymarketStats] Upsert error:', upsertError);
        return { success: false, error: upsertError.message };
      }

      setOverrideAddressState(address.toLowerCase());
      
      // Refetch data with new override
      await fetchData();

      return { success: true };
    } catch (err) {
      console.error('[usePolymarketStats] Set override error:', err);
      return { success: false, error: 'Failed to save override' };
    }
  }, [walletAddress, fetchData]);

  const clearOverrideAddress = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!walletAddress) {
      return { success: false, error: 'No wallet address' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('polymarket_profile_overrides')
        .delete()
        .eq('wallet_address', walletAddress.toLowerCase());

      if (deleteError) {
        console.error('[usePolymarketStats] Delete error:', deleteError);
        return { success: false, error: deleteError.message };
      }

      setOverrideAddressState(null);
      
      // Refetch data without override
      await fetchData();

      return { success: true };
    } catch (err) {
      console.error('[usePolymarketStats] Clear override error:', err);
      return { success: false, error: 'Failed to clear override' };
    }
  }, [walletAddress, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isEmpty = !loading && !error && (!data || data.noData === true || 
    (data.stats?.totalTrades === 0 && data.positions?.length === 0 && data.closedPositions?.length === 0));

  return {
    data,
    loading,
    error,
    isEmpty,
    overrideAddress,
    refetch: fetchData,
    setOverrideAddress,
    clearOverrideAddress,
  };
}
