import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { SubdomainMintModal } from '@/components/SubdomainMintModal';
import { useLanguage } from '@/contexts/LanguageContext';
import patternTiles from '@/assets/pattern-tiles.jpeg';
import { MiniKit } from '@worldcoin/minikit-js';

const Index = () => {
  const { t } = useLanguage();
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [selectedSubdomain, setSelectedSubdomain] = useState('');
  const [subdomainPrice, setSubdomainPrice] = useState(0);

  // Listen for wallet connection events from WalletConnection component
  useEffect(() => {
    const handleWalletChange = (event: CustomEvent) => {
      setUser(event.detail);
    };

    window.addEventListener('wallet-connected', handleWalletChange as EventListener);
    window.addEventListener('wallet-disconnected', () => setUser(null));

    return () => {
      window.removeEventListener('wallet-connected', handleWalletChange as EventListener);
      window.removeEventListener('wallet-disconnected', () => setUser(null));
    };
  }, []);

  // Listen for mint modal events from SearchInterface
  useEffect(() => {
    const handleMintRequest = (event: CustomEvent) => {
      console.log('open-mint-modal event received:', event.detail);
      setSelectedSubdomain(event.detail.subdomain);
      setSubdomainPrice(event.detail.price);
      setShowMintModal(true);
      console.log('Modal state set to true');
    };

    window.addEventListener('open-mint-modal', handleMintRequest as EventListener);
    console.log('Mint modal listener registered');

    return () => {
      window.removeEventListener('open-mint-modal', handleMintRequest as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      
      <Header />
      
      {/* Hero Section - Top aligned for mobile */}
      <main className="flex-1 px-4 pt-24 md:pt-24 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          {/* Main Heading */}
          <PersonalizedHeader user={user} />

          {/* Search Interface */}
          <SearchInterface />

          {/* Mint Modal - Inline */}
          <SubdomainMintModal
            isOpen={showMintModal}
            onClose={() => setShowMintModal(false)}
            subdomain={selectedSubdomain}
            price={subdomainPrice}
          />
        </div>
        
      </main>
      <footer className="py-6 text-center text-xs text-foreground dark:text-white">
        {t('copyright')}
      </footer>
    </div>
  );
};

export default Index;
