import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { SubdomainMintModal } from '@/components/SubdomainMintModal';
import { UserDomainsDisplay } from '@/components/UserDomainsDisplay';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import patternTiles from '@/assets/pattern-tiles.jpeg';
import { MiniKit } from '@worldcoin/minikit-js';

const Index = () => {
  const { t } = useLanguage();
  const [user, setUser] = useState<{ username?: string; walletAddress?: string } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [subdomainPrice, setSubdomainPrice] = useState(0);
  const [resultAvatar, setResultAvatar] = useState<string | undefined>();
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const [showMyIds, setShowMyIds] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | undefined>();

  // Listen for wallet connection events from WalletConnection component
  useEffect(() => {
    const handleWalletChange = (event: CustomEvent) => {
      setUser(event.detail);
      setWalletAddress(event.detail?.walletAddress);
    };

    const handleShowSearch = () => {
      setShowMyIds(false);
      setIsMintModalOpen(false);
    };

    const handleShowMintModal = () => {
      if (selectedDomain) {
        setIsMintModalOpen(true);
        setShowMyIds(false);
      }
    };

    window.addEventListener('wallet-connected', handleWalletChange as EventListener);
    window.addEventListener('wallet-disconnected', () => {
      setUser(null);
      setWalletAddress(undefined);
    });
    window.addEventListener('show-search', handleShowSearch);
    window.addEventListener('show-mint-modal', handleShowMintModal);

    return () => {
      window.removeEventListener('wallet-connected', handleWalletChange as EventListener);
      window.removeEventListener('wallet-disconnected', () => {
        setUser(null);
        setWalletAddress(undefined);
      });
      window.removeEventListener('show-search', handleShowSearch);
      window.removeEventListener('show-mint-modal', handleShowMintModal);
    };
  }, [selectedDomain]);

  const handleDomainSelect = (domain: string, price: number, avatar?: string) => {
    setSelectedDomain(domain);
    setSubdomainPrice(price);
    setResultAvatar(avatar);
    setIsMintModalOpen(true);
    setShowMyIds(false);
  };

  const handleViewMyIds = () => {
    setShowMyIds(true);
    setIsMintModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden border-l-2 border-r-2 border-b-2 border-[#D4AF37]">
      
      <Header />
      
      {/* Hero Section - Optimized for mobile (no scroll) with proper header spacing */}
      <main className="flex-1 px-4 pt-20 md:pt-24 pb-2 relative z-10 overflow-hidden">
        <div className="max-w-2xl mx-auto text-center h-full flex flex-col">
          <SearchInterface 
            onDomainSelect={handleDomainSelect}
            onViewMyIds={handleViewMyIds}
          />
          
          {showMyIds && <UserDomainsDisplay walletAddress={walletAddress} />}
          
          {isMintModalOpen && selectedDomain && (
            <SubdomainMintModal
              isOpen={isMintModalOpen}
              onClose={() => setIsMintModalOpen(false)}
              subdomain={selectedDomain}
              price={subdomainPrice}
              resultAvatar={resultAvatar}
            />
          )}
        </div>
      </main>
      <footer className="py-2 text-center text-[10px] md:text-xs text-foreground dark:text-white">
        {t('copyright')}
      </footer>
    </div>
  );
};

export default Index;
