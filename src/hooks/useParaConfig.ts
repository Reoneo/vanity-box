import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParaConfig {
  paraApiKey: string;
  walletConnectProjectId: string;
}

interface UseParaConfigReturn {
  config: ParaConfig | null;
  isLoading: boolean;
  error: string | null;
}

export const useParaConfig = (): UseParaConfigReturn => {
  const [config, setConfig] = useState<ParaConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-para-config');
        
        if (fnError) {
          console.error('Failed to fetch Para config:', fnError);
          setError('Failed to load wallet configuration');
          return;
        }

        if (data?.error) {
          console.error('Para config error:', data.error);
          setError(data.error);
          return;
        }

        if (data?.paraApiKey) {
          setConfig({
            paraApiKey: data.paraApiKey,
            walletConnectProjectId: data.walletConnectProjectId || '',
          });
        } else {
          setError('Para API key not configured');
        }
      } catch (err) {
        console.error('Error fetching Para config:', err);
        setError('Failed to load wallet configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, isLoading, error };
};
