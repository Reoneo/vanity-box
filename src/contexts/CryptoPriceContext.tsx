// Context for prefetching and caching crypto prices globally
import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchCryptoPrices, CryptoPrices } from '@/utils/cryptoPrices';

interface CryptoPriceContextValue {
  prices: CryptoPrices;
  isLoading: boolean;
  lastUpdated: number | null;
}

const CryptoPriceContext = createContext<CryptoPriceContextValue>({
  prices: { eth: 2600, wld: 1.85, usdc: 1.0, apt: 8.5, iota: 0.22 },
  isLoading: true,
  lastUpdated: null,
});

export const useCryptoPrices = () => useContext(CryptoPriceContext);

export const CryptoPriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<CryptoPrices>({
    eth: 2600,
    wld: 1.85,
    usdc: 1.0,
    apt: 8.5,
    iota: 0.22,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const freshPrices = await fetchCryptoPrices();
        setPrices(freshPrices);
        setLastUpdated(Date.now());
      } catch (error) {
        console.error('[CryptoPrices] Failed to load:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load immediately
    loadPrices();

    // Refresh every 60 seconds
    const interval = window.setInterval(loadPrices, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <CryptoPriceContext.Provider value={{ prices, isLoading, lastUpdated }}>
      {children}
    </CryptoPriceContext.Provider>
  );
};
