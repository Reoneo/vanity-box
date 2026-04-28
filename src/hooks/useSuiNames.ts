import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SuinsName {
  identifier: string;
  contract: string;
  collection: string;
  name: string;
  description: string;
  image_url: string;
  chain: 'sui';
}

export function useSuiNames(address?: string | null) {
  const [names, setNames] = useState<SuinsName[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!address) {
      setNames([]);
      setFetched(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('get-suins-names', {
          body: { address },
        });
        if (cancelled) return;
        setNames(((data as any)?.names || []) as SuinsName[]);
      } catch (e) {
        console.error('[useSuiNames] failed', e);
        if (!cancelled) setNames([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFetched(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { names, loading, fetched };
}
