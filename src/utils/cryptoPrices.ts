// Utility for fetching real-time cryptocurrency prices via edge function proxy
import { supabase } from "@/integrations/supabase/client";

export interface CryptoPrices {
  eth: number;
  wld: number;
  usdc: number;
  apt: number;
}

export async function fetchCryptoPrices(): Promise<CryptoPrices> {
  try {
    const { data, error } = await supabase.functions.invoke('get-crypto-prices');

    if (error) {
      throw error;
    }

    if (data?.success && data?.prices) {
      return {
        eth: data.prices.eth || 2500,
        wld: data.prices.wld || 2.0,
        usdc: data.prices.usdc || 1.0,
        apt: data.prices.apt || 8.5,
      };
    }

    throw new Error('Invalid response from crypto prices API');
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    // Return fallback prices
    return {
      eth: 2500,
      wld: 2.0,
      usdc: 1.0,
      apt: 8.5,
    };
  }
}
