import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ParaConfig {
  paraApiKey: string;
  walletConnectProjectId: string;
  env?: "BETA" | "PROD" | string;
  environment?: "BETA" | "PROD" | string;
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
          console.error("[Para] Failed to fetch config:", fnError);
          if (!cancelled) setError("Failed to load wallet configuration");
          return;
        }

        if (data?.error) {
          console.error("[Para] Config error:", data.error);
          if (!cancelled) setError(String(data.error));
          return;
        }

        const paraApiKey = String(data?.paraApiKey ?? "").trim();
        const walletConnectProjectId = String(data?.walletConnectProjectId ?? "").trim();
        const env = data?.env ?? data?.environment;

        if (!paraApiKey) {
          if (!cancelled) setError("Para API key not configured");
          return;
        }

        if (!cancelled) {
          setConfig({
            paraApiKey,
            walletConnectProjectId,
            env,
            environment: data?.environment,
          });
        }
      } catch (err) {
        console.error("[Para] Error fetching config:", err);
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
