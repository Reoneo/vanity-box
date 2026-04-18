import React, { useState, useEffect } from 'react';
import { Fuel } from 'lucide-react';
import { fetchWorldChainGasPrice } from '@/utils/worldChainGas';

export const GasDisplay: React.FC = () => {
  const [gasPrice, setGasPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGas = async () => {
      try {
        const price = await fetchWorldChainGasPrice();
        setGasPrice(price);
      } catch (e) {
        console.error('Failed to fetch gas price:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGas();
    
    // Update every 15 seconds
    const interval = window.setInterval(fetchGas, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1 text-[10px] md:text-xs text-black font-bold">
      <Fuel className="w-3 h-3" />
      <span>FREE</span>
    </div>
  );
};
