import { useContext } from 'react';
import { PetraWalletContext } from '@/contexts/PetraWalletContext';

export const usePetraWallet = () => {
  const context = useContext(PetraWalletContext);
  
  if (context === undefined) {
    throw new Error('usePetraWallet must be used within a PetraWalletProvider');
  }
  
  return context;
};
