import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SuiNft {
  identifier: string;
  contract: string;
  collection: string;
  name: string;
  description: string;
  image_url: string;
  chain: 'sui';
}

export interface SuiToken {
  chain: 'sui';
  symbol: string;
  coinType: string;
  name: string;
  balance: number;
  rawBalance: string;
  decimals: number;
}

export interface SuiTx {
  hash: string;
  timestamp: number | null;
  sender: string;
  status: string;
  gasFee: any;
  balanceChanges: any[];
  chain: 'sui';
}

export function useSuiAssets(address?: string | null) {
  const [nfts, setNfts] = useState<SuiNft[]>([]);
  const [tokens, setTokens] = useState<SuiToken[]>([]);
  const [transactions, setTransactions] = useState<SuiTx[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setNfts([]); setTokens([]); setTransactions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [n, t, x] = await Promise.all([
          supabase.functions.invoke('get-sui-nfts', { body: { address } }),
          supabase.functions.invoke('get-sui-tokens', { body: { address } }),
          supabase.functions.invoke('get-sui-transactions', { body: { address, limit: 25 } }),
        ]);
        if (cancelled) return;
        setNfts((n.data as any)?.nfts || []);
        setTokens((t.data as any)?.tokens || []);
        setTransactions((x.data as any)?.transactions || []);
      } catch (e) {
        console.error('useSuiAssets failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  return { nfts, tokens, transactions, loading };
}
