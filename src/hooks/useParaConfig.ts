import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ParaConfig {
  paraApiKey: string;
  walletConnectProjectId: string;

  // Your edge function may return env later; we tolerate it now.
  env?: "BETA" | "PROD" | string;
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
    let cancelled = false;

    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fnError } = await supabase.functions.invoke("get-para-config");

        if (fnError) {
          console.error("Failed to fetch Para config:", fnError);
          if (!cancelled) setError("Failed to load wallet configuration");
          return;
        }

        if (data?.error) {
          console.error("Para config error:", data.error);
          if (!cancelled) setError(data.error);
          return;
        }

        const paraApiKey = (data?.paraApiKey || "").trim();
        const walletConnectProjectId = (data?.walletConnectProjectId || "").trim();
        const env = data?.env; // optional

        if (!paraApiKey) {
          if (!cancelled) setError("Para API key not configured");
          return;
        }

        if (!cancelled) {
          setConfig({
            paraApiKey,
            walletConnectProjectId,
            env,
          });
        }
      } catch (err) {
        console.error("Error fetching Para config:", err);
        if (!cancelled) setError("Failed to load wallet configuration");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, isLoading, error };
};
