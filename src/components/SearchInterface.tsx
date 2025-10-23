import React, { useState, useEffect } from 'react';
import { Search, X, Filter, ChevronDown, ArrowLeft, Globe, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { SubdomainMintModal } from '@/components/SubdomainMintModal';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { UserDomainsDisplay } from '@/components/UserDomainsDisplay';
import { MiniKit } from '@worldcoin/minikit-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import ensLogoBlue from '@/assets/ens-logo-blue.png';
import ensLogoWhite from '@/assets/ens-logo-white.png';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';
import smithBoxAvatar from '@/assets/smith-box-avatar.jpeg';
import vapeBoxAvatar from '@/assets/vape-box-avatar.webp';
import aptosLogo from '@/assets/aptos-logo.png';
import aptosNamesIcon from '@/assets/aptos-names-icon.jpeg';
import aptosNamesLight from '@/assets/aptos-names-light.png';
import aptosNamesNew from '@/assets/aptos-names-new.jpeg';
import avvyLogo from '@/assets/avvy-logo.png';
import smithAptAvatar from '@/assets/smith-apt-avatar.png';
import termuxAvatar from '@/assets/termux-avatar.png';
import ensV2Logo from '@/assets/ens-v2-logo.png';
import web3BioLogo from '@/assets/web3bio-logo.png';
import efpLogoFullDark from '@/assets/efp-logo-full-dark.png';

export interface FilterState {
  protocol: string[];
  club: string[];
}

interface ENSResult {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  category: string | string[];
  club: string | string[];
}

interface Web3BioProfile {
  avatar?: string;
  displayName?: string;
  description?: string;
  address?: string;
  platform?: string;
  identity?: string;
  links?: any;
  header?: string;
  location?: string;
  email?: string;
}

interface EFPStats {
  followers_count?: number;
  following_count?: number;
}

export const SearchInterface = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [displayQuery, setDisplayQuery] = useState(''); // The actual searched query for display
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [showMintInterface, setShowMintInterface] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ENSResult | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ protocol: [], club: [] });
  const [ensResults, setEnsResults] = useState<ENSResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
  const [showMyIDs, setShowMyIDs] = useState(false);
  const [web3BioProfile, setWeb3BioProfile] = useState<Web3BioProfile | null>(null);
  const [efpStats, setEfpStats] = useState<EFPStats | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [userDomains, setUserDomains] = useState<string[]>([]);

  // Get wallet address from MiniKit
  useEffect(() => {
    const checkWallet = () => {
      const address = MiniKit.user?.walletAddress;
      setWalletAddress(address);
    };
    
    checkWallet();
    
    // Listen for wallet connection events
    const handleWalletChange = (event: CustomEvent) => {
      setWalletAddress(event.detail?.walletAddress);
    };
    
  const handleShowMyIDs = () => {
    setShowMyIDs(true);
    setShowMintInterface(false);
    window.dispatchEvent(new CustomEvent('show-my-ids'));
  };
    
    window.addEventListener('wallet-connected', handleWalletChange as EventListener);
    window.addEventListener('wallet-disconnected', () => {
      setWalletAddress(undefined);
      setShowMyIDs(false);
    });
    window.addEventListener('show-my-ids', handleShowMyIDs);
    
    return () => {
      window.removeEventListener('wallet-connected', handleWalletChange as EventListener);
      window.removeEventListener('wallet-disconnected', () => {
        setWalletAddress(undefined);
        setShowMyIDs(false);
      });
      window.removeEventListener('show-my-ids', handleShowMyIDs);
    };
  }, []);

  const protocols = ['Aptos Names', 'Avvy Domains', 'DNS', 'ENS'];
  const clubs = ['Crypto', 'DeFi', 'Dev', 'Digits', 'Letters', 'Surname', 'Startup', 'Artist'];

  // Re-fetch results when language changes
  useEffect(() => {
    if (hasSearched && ensResults.length > 0) {
      const allResults = getAllResults();
      if (filters.protocol.length === 0 && filters.club.length === 0) {
        setEnsResults(allResults);
      } else {
        const filteredResults = allResults.filter(result => {
          const categories = Array.isArray(result.category) ? result.category : [result.category];
          const clubs = Array.isArray(result.club) ? result.club : [result.club];
          
          const protocolMatch = filters.protocol.length === 0 || 
            filters.protocol.some(p => categories.includes(p));
          const clubMatch = filters.club.length === 0 || 
            filters.club.some(c => clubs.includes(c));
          return protocolMatch && clubMatch;
        });
        setEnsResults(filteredResults);
      }
    }
  }, [language]);

  const getSubdomainPrice = (subdomain: string) => {
    const length = subdomain.length;
    if (length === 1) return 100;
    if (length === 2) return 50;
    if (length === 3) return 25;
    if (length === 4) return 15;
    if (length === 5) return 10;
    if (length >= 6 && length <= 9) return 5;
    return 1;
  };

  const handleProtocolToggle = (protocol: string) => {
    const newProtocols = filters.protocol.includes(protocol)
      ? filters.protocol.filter(p => p !== protocol)
      : [...filters.protocol, protocol];
    
    setFilters({
      ...filters,
      protocol: newProtocols
    });
  };

  const handleClubToggle = (club: string) => {
    const newClubs = filters.club.includes(club)
      ? filters.club.filter(c => c !== club)
      : [...filters.club, club];
    
    setFilters({
      ...filters,
      club: newClubs
    });
  };

  const handleClearFilters = () => {
    setFilters({ protocol: [], club: [] });
    setShowFilterDropdown(false);
    setEnsResults([]);
  };

  const handleApplyFilters = () => {
    if (filters.protocol.length > 0 || filters.club.length > 0) {
      handleSearch();
    }
    setShowFilterDropdown(false);
  };

  const getAllResults = () => {
    const allResults = [
      {
        name: 'Smith.cash',
        description: t('desc_smith_cash'),
        imageUrl: smithCashAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Surname', 'DeFi']
      },
      {
        name: 'Smith.box',
        description: t('desc_smith_cash'),
        imageUrl: smithBoxAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Surname', 'DeFi']
      },
      {
        name: 'Vape.box',
        description: t('desc_vape_box'),
        imageUrl: vapeBoxAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Startup', 'DeFi']
      },
      {
        name: 'altcoin.chain',
        description: t('desc_altcoin_chain'),
        imageUrl: termuxAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Crypto', 'DeFi']
      },
      {
        name: '30315.eth',
        description: t('desc_30315'),
        imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/f4ba02d96f0f9edccaee4a242f0fdf/82f4ba02d96f0f9edccaee4a242f0fdf.svg',
        price: 1,
        category: 'ENS',
        club: 'Digits'
      },
      {
        name: 'MexiPay.eth',
        description: t('desc_mexipay'),
        imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/1b420ade2f21c60b34fe53f761d09a/551b420ade2f21c60b34fe53f761d09a.svg',
        price: 5,
        category: 'ENS',
        club: 'DeFi'
      },
      {
        name: 'GuavaPay.eth',
        description: t('desc_guavapay'),
        imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/44d2edb2482769d623f27e7c94cd46/7044d2edb2482769d623f27e7c94cd46.svg',
        price: 5,
        category: 'ENS',
        club: 'DeFi'
      },
      {
        name: 'TeamXRP.eth',
        description: t('desc_teamxrp'),
        imageUrl: 'https://raw2.seadn.io/ethereum/0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85/c1f98f3f469ba9be9e8dee87f4cfa7/a4c1f98f3f469ba9be9e8dee87f4cfa7.svg',
        price: 5,
        category: 'ENS',
        club: 'Crypto'
      },
      {
        name: '$mith.eth',
        description: t('desc_smith'),
        imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/fe754f2d9414b8f5edd443ccd5ac92/2cfe754f2d9414b8f5edd443ccd5ac92.svg',
        price: 5,
        category: 'ENS',
        club: 'Surname'
      },
      {
        name: 'smith.apt',
        description: t('desc_smith_apt'),
        imageUrl: smithAptAvatar,
        price: 5,
        category: 'Aptos Names',
        club: 'Surname'
      },
      {
        name: 'Termux.eth',
        description: t('desc_termux'),
        imageUrl: termuxAvatar,
        price: 5,
        category: 'ENS',
        club: 'Dev'
      }
    ];
    return allResults;
  };

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    
    // Prevent searches with spaces
    if (trimmedQuery.includes(' ')) {
      return;
    }
    
    // Update the display query to match what's being searched
    setDisplayQuery(trimmedQuery);
    
    setIsLoading(true);
    setHasSearched(true);
    setWeb3BioProfile(null);
    setEfpStats(null);
    setIsSearchActive(true);
    
    // Check if query is a wallet address (starts with 0x and 42 characters)
    const isWalletAddress = trimmedQuery.startsWith('0x') && trimmedQuery.length === 42;
    
    // If query contains a dot OR is a wallet address, fetch web3.bio profile
    if (trimmedQuery.includes('.') || isWalletAddress) {
      try {
        const { data, error } = await supabase.functions.invoke('get-web3bio-profile', {
          body: { handle: trimmedQuery }
        });
        
        if (error) throw error;
        
        if (data && !data.error && Array.isArray(data) && data.length > 0) {
          const profileData = data[0];
          setWeb3BioProfile(profileData);
          setEnsResults([]); // Clear ENS results when showing web3.bio profile
          
          // Fetch EFP stats if we have an address
          if (profileData.address) {
            try {
              const { data: efpData, error: efpError } = await supabase.functions.invoke('get-efp-stats', {
                body: { address: profileData.address }
              });
              
              if (!efpError && efpData) {
                setEfpStats(efpData);
              }
            } catch (efpError) {
              console.error('Error fetching EFP stats:', efpError);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching web3.bio profile:', error);
      }
      setIsLoading(false);
      return;
    }
    
    // Fetch user's domains if wallet is connected
    if (walletAddress) {
      try {
        const { data: domainsData } = await supabase.functions.invoke('get-user-domains', {
          body: { walletAddress }
        });
        if (domainsData?.domains) {
          setUserDomains(domainsData.domains.map((d: any) => `${d.name}.${d.domain}`.toLowerCase()));
        }
      } catch (error) {
        console.error('Error fetching user domains:', error);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const allResults = getAllResults();
    
    // Filter results
    let filteredResults = allResults;
    
    // Apply protocol and club filters if any are selected
    if (filters.protocol.length > 0 || filters.club.length > 0) {
      filteredResults = allResults.filter(result => {
        const categories = Array.isArray(result.category) ? result.category : [result.category];
        const clubs = Array.isArray(result.club) ? result.club : [result.club];
        
        const protocolMatch = filters.protocol.length === 0 || 
          filters.protocol.some(p => categories.includes(p));
        const clubMatch = filters.club.length === 0 || 
          filters.club.some(c => clubs.includes(c));
        return protocolMatch && clubMatch;
      });
    } else {
      // If no filters are applied, only show Smith.cash, Smith.box, Vape.box, and altcoin.chain by default
      filteredResults = allResults.filter(result => 
        result.name === 'Smith.cash' || result.name === 'Smith.box' || result.name === 'Vape.box' || result.name === 'altcoin.chain'
      );
    }
    
    setEnsResults(filteredResults);
    
    if (searchQuery) {
      setIsAvailable(!searchQuery.toLowerCase().includes('taken'));
    }
    setIsLoading(false);
  };

  const handleMint = (result: ENSResult) => {
    setSelectedResult(result);
    setShowMintInterface(true);
  };

  const handleBackToResults = () => {
    setShowMintInterface(false);
    setSelectedResult(null);
  };

  const handleFlipCard = (index: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const searchResults = searchQuery && !isLoading && isAvailable !== null;
  const price = displayQuery ? getSubdomainPrice(displayQuery) : 0;
  const hasFilters = filters.protocol.length > 0 || filters.club.length > 0;
  const totalFilters = filters.protocol.length + filters.club.length;

  return (
    <>
      {showFilterDropdown && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
      )}
      
      <div className="w-full">
        {/* Show mint interface when a result is selected */}
        {showMintInterface && selectedResult ? (
          <SubdomainMintModal
            isOpen={true}
            onClose={handleBackToResults}
            subdomain={displayQuery ? `${displayQuery}.${selectedResult.name}` : selectedResult.name}
            price={price}
            resultAvatar={selectedResult.imageUrl}
          />
        ) : (
          <>
            {/* Main Heading - hidden when mint is open or showing My IDs or web3.bio profile */}
            {!showMintInterface && !showMyIDs && !web3BioProfile && <PersonalizedHeader user={null} isSearchActive={isSearchActive} />}
            
            {/* My IDs Header with Back Button - shown when displaying IDs */}
            {!showMintInterface && showMyIDs && (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setShowMyIDs(false);
                    window.dispatchEvent(new Event('back-to-domains'));
                  }}
                  className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-[#D4AF37] dark:hover:text-[#D4AF37] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">{t('back')}</span>
                </button>
                <h1 className="text-3xl md:text-5xl font-bold text-center text-gray-900 dark:text-white whitespace-nowrap">
                  {t('my_ids')}
                </h1>
              </div>
            )}
            
            {/* Search bar container - hidden when showing My IDs */}
            {!showMyIDs && (
            <div className="w-full max-w-md mx-auto mb-4 md:mb-0 mt-4">
              <div className="relative">
                <div className="absolute left-1 top-1 z-10 flex items-center h-10">
                  <DropdownMenu open={showFilterDropdown} onOpenChange={setShowFilterDropdown}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black border-[#D4AF37] rounded-md flex items-center justify-center"
                      >
                        <Filter className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-80 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-4 z-50">
                      <div className="relative">
                        <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl" />
                        
                        <div className="relative z-10 space-y-4">
                          <DropdownMenuLabel className="text-lg font-semibold text-white">Filter</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                          
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-300">{t('protocol')}</p>
                            <div className="flex flex-wrap gap-2">
                              {protocols.map(protocol => (
                                <label
                                  key={protocol}
                                  className={cn(
                                    "px-4 py-2 rounded-full cursor-pointer transition-all duration-300 flex items-center gap-2 text-sm font-medium border-2",
                                    filters.protocol.includes(protocol)
                                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                      : "bg-gray-800/50 text-gray-300 border-gray-700 hover:border-[#D4AF37]/50 hover:bg-gray-700/50"
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleProtocolToggle(protocol);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={filters.protocol.includes(protocol)}
                                    onChange={() => handleProtocolToggle(protocol)}
                                  />
                                  {protocol}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                          
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-300">{t('club')}</p>
                            <div className="flex flex-wrap gap-2">
                              {clubs.map(club => (
                                <label
                                  key={club}
                                  className={cn(
                                    "px-4 py-2 rounded-full cursor-pointer transition-all duration-300 flex items-center gap-2 text-sm font-medium border-2",
                                    filters.club.includes(club)
                                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                      : "bg-gray-800/50 text-gray-300 border-gray-700 hover:border-[#D4AF37]/50 hover:bg-gray-700/50"
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleClubToggle(club);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={filters.club.includes(club)}
                                    onChange={() => handleClubToggle(club)}
                                  />
                                  {club}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                          
                           <div className="flex justify-between gap-3 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleClearFilters}
                              className="flex-1 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
                            >
                              Clear
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                handleApplyFilters();
                                setShowFilterDropdown(false);
                              }}
                              className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Input
                  placeholder={t('search_for_a_name')}
                  className="h-12 text-sm text-center bg-white dark:bg-gray-900 border-[#D4AF37] focus:border-[#D4AF37] text-gray-900 dark:text-white placeholder-gray-900 dark:placeholder-white pl-20 pr-20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                      setIsSearchActive(true);
                    }
                  }}
                  onFocus={() => setIsSearchActive(true)}
                />
                <div className="absolute right-1 top-1 flex items-center gap-1 h-10">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setEnsResults([]);
                        setIsAvailable(null);
                        setHasSearched(false);
                        setWeb3BioProfile(null);
                        setIsSearchActive(false);
                      }}
                      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4 text-black dark:text-white" />
                    </button>
                  )}
                  <Button
                    onClick={handleSearch}
                    size="sm"
                    className="h-8 px-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                    disabled={!searchQuery.trim() || isLoading}
                  >
                    <Search className="w-4 h-4 text-black" />
                  </Button>
                </div>
              </div>
            </div>
            )}
            
            {/* ENS V2 Info Section - Shows when no search results and not showing My IDs */}
            {!hasSearched && !showMyIDs && (
              <div className="w-full max-w-2xl mx-auto mt-2 md:mt-4 px-2 md:px-4">
                <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
                  <CardContent className="p-3 md:p-8">
                    {/* Logo */}
                    <div className="flex justify-center mb-3 md:mb-6">
                      <img src={ensV2Logo} alt="ENS V2" className="h-10 md:h-20 w-auto" />
                    </div>
                    
                    {/* Benefits List */}
                    <div className="space-y-2 md:space-y-4 text-white text-center">
                      <div>
                        <h3 className="font-semibold text-sm md:text-xl mb-1 text-white">One Name, Any Chain</h3>
                        <p className="text-gray-300 text-xs md:text-base leading-snug">ENS names work across Ethereum L1, all L2s and World Chain.</p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-sm md:text-xl mb-1 text-white">Low Fees, Fast Updates</h3>
                        <p className="text-gray-300 text-xs md:text-base leading-snug">Instant management with near-zero gas fees.</p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-sm md:text-xl mb-1 text-white">Full ENS Functionality</h3>
                        <p className="text-gray-300 text-xs md:text-base leading-snug">Manage profiles, records, wallets, metadata—all from World App.</p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-sm md:text-xl mb-1 text-white">Future-Proof Identity</h3>
                        <p className="text-gray-300 text-xs md:text-base leading-snug">ENS makes your identity portable and interoperable.</p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-sm md:text-xl mb-1 text-white">Subdomain Value</h3>
                        <p className="text-gray-300 text-xs md:text-base leading-snug">ENS subdomains are digital assets gaining utility and value.</p>
                      </div>
                    </div>
                    
                    {/* Learn More Button */}
                    <div className="mt-3 md:mt-6 flex justify-center">
                      <a
                        href="https://ens.domains/ensv2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 md:px-6 md:py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg text-sm md:text-base"
                      >
                        Learn More
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Web3.bio Profile Result - Social Media Style - Only show when search is active */}
            {web3BioProfile && hasSearched && (
              <div className="w-full sm:max-w-3xl sm:mx-auto mt-8">
                <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
                  {/* Header/Banner */}
                  <div className="relative h-32 sm:h-48 bg-gradient-to-r from-[#D4AF37]/20 via-[#F7E06C]/10 to-[#D4AF37]/20">
                    {web3BioProfile.header && (
                      <img 
                        src={web3BioProfile.header} 
                        alt="Profile header"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/60"></div>
                  </div>
                  
                   <CardContent className="relative -mt-16 sm:-mt-20 px-4 sm:px-6 pb-6 flex flex-col items-center">
                     {/* Avatar */}
                     <div className="relative inline-block mb-4">
                       <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-xl opacity-60"></div>
                       <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)] bg-gray-800">
                         {web3BioProfile.avatar ? (
                           <img 
                             src={web3BioProfile.avatar} 
                             alt={web3BioProfile.displayName || searchQuery}
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-4xl text-white font-bold">
                             {(web3BioProfile.displayName || searchQuery).charAt(0).toUpperCase()}
                           </div>
                         )}
                       </div>
                     </div>
                     
                     {/* Profile Info - Centered */}
                     <div className="space-y-3 flex flex-col items-center text-center w-full">
                       <div className="flex flex-col items-center">
                         <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                           {web3BioProfile.displayName || searchQuery}
                         </h3>
                        {web3BioProfile.address && (
                           <div className="flex items-center gap-2 justify-center">
                             <p className="text-[#D4AF37] text-sm font-mono">
                               {web3BioProfile.address.slice(0, 6)}...{web3BioProfile.address.slice(-4)}
                             </p>
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-6 w-6 p-0 hover:bg-[#D4AF37]/20"
                               onClick={() => {
                                 navigator.clipboard.writeText(web3BioProfile.address);
                                 const event = new CustomEvent('show-toast', {
                                   detail: {
                                     title: 'Copied!',
                                     description: 'Wallet address copied to clipboard',
                                   }
                                 });
                                 window.dispatchEvent(event);
                               }}
                             >
                               <Copy className="h-3 w-3 text-[#D4AF37]" />
                             </Button>
                           </div>
                         )}
                       </div>
                      
                      {/* Bio/Description */}
                      {web3BioProfile.description && (
                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                          {web3BioProfile.description}
                        </p>
                      )}
                      
                       {/* Location and Email */}
                       <div className="flex flex-wrap gap-4 text-sm text-gray-400 justify-center">
                         {web3BioProfile.location && (
                           <div className="flex items-center gap-1">
                             <Globe className="w-4 h-4" />
                             <span>{web3BioProfile.location}</span>
                           </div>
                         )}
                         {web3BioProfile.email && (
                           <div className="flex items-center gap-1">
                             <span>✉️</span>
                             <span>{web3BioProfile.email}</span>
                           </div>
                         )}
                        </div>
                       
                       {/* Follower Stats */}
                      <div className="flex gap-6 pt-2">
                        <div className="text-center">
                          <div className="text-xl sm:text-2xl font-bold text-white">
                            {efpStats?.following_count ?? 0}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400">Following</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl sm:text-2xl font-bold text-white">
                            {efpStats?.followers_count ?? 0}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400">Followers</div>
                        </div>
                      </div>
                      
                       {/* Social Links */}
                       {web3BioProfile.links && Object.keys(web3BioProfile.links).length > 0 && (
                         <div className="flex flex-wrap gap-3 pt-2 justify-center">
                           {web3BioProfile.links.twitter && (
                             <a
                               href={web3BioProfile.links.twitter.link}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                             >
                               <span>𝕏</span>
                               <span>@{web3BioProfile.links.twitter.handle}</span>
                             </a>
                           )}
                           {web3BioProfile.links.github && (
                             <a
                               href={web3BioProfile.links.github.link}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                             >
                               <span>⚙️</span>
                               <span>@{web3BioProfile.links.github.handle}</span>
                             </a>
                           )}
                           {web3BioProfile.links.website && (
                             <a
                               href={web3BioProfile.links.website.link}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                             >
                               <Globe className="w-4 h-4" />
                               <span>{web3BioProfile.links.website.handle}</span>
                             </a>
                           )}
                         </div>
                       )}
                      
                       {/* Action Buttons */}
                       <div className="flex gap-3 pt-4 w-full max-w-md">
                          <a
                            href={`https://ethfollow.xyz/${web3BioProfile.address || searchQuery}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center py-3 rounded-xl transition-all duration-300 hover:opacity-80"
                          >
                            <img 
                              src={efpLogoFullDark} 
                              alt="EFP" 
                              className="h-14 w-auto object-contain"
                            />
                          </a>
                          <a
                            href={`https://web3.bio/${searchQuery}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 hover:opacity-80 rounded-xl transition-opacity"
                          >
                            <img 
                              src={web3BioLogo} 
                              alt="Web3.bio" 
                              className="w-10 h-10 object-contain"
                            />
                          </a>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* My ID's Section */}
            {walletAddress && showMyIDs && (
              <div className="w-full sm:max-w-3xl sm:mx-auto mt-8">
                <UserDomainsDisplay walletAddress={walletAddress} />
              </div>
            )}

            {/* Results container - same width as search bar */}
            <div className="w-full sm:max-w-3xl sm:mx-auto">
              {hasSearched && ensResults.length > 0 && !web3BioProfile && !showMyIDs && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-500">
            {ensResults.map((result, index) => {
              const isFlipped = flippedCards.has(index);
              return (
                <div key={index} className="perspective-1000 min-h-[320px]">
                  <div className={`relative w-full h-full min-h-[320px] transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front of Card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_50px_rgba(212,175,55,0.3)] transition-all duration-500 hover:scale-[1.02]">
                      
                      <div className="relative p-6 flex flex-col items-center text-center min-h-[320px]">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-xl opacity-60 animate-pulse"></div>
                          <div className="relative w-28 h-28 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)]">
                            <img 
                              src={result.imageUrl} 
                              alt={result.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        
                         <h3 className="font-mono text-xl font-bold text-white mb-4 leading-tight px-4 w-full break-words flex items-center justify-center">
                           {displayQuery ? `${displayQuery}.${result.name}` : result.name}
                         </h3>
                        
                        <div className="flex items-center justify-center gap-1 mb-2 overflow-x-auto max-w-full flex-nowrap">
                          {(Array.isArray(result.category) ? result.category : [result.category]).map((cat, catIndex) => (
                            <Badge 
                              key={`cat-${catIndex}`}
                              className={cn(
                                "text-xs px-2 py-0.5 flex items-center gap-1 font-semibold rounded-full border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity",
                                cat === 'ENS' && "bg-transparent text-white border-[#D4AF37]",
                                cat === 'DNS' && "bg-transparent text-white border-blue-500",
                                cat === 'Aptos Names' && "bg-transparent text-white border-purple-500"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProtocolToggle(cat);
                                handleSearch();
                              }}
                            >
                              {cat === 'ENS' && <img src={ensLogoWhite} alt="ENS" className="w-3 h-3" />}
                              {cat === 'DNS' && <Globe className="w-3 h-3" />}
                              {cat === 'Aptos Names' && (
                                <img src={aptosNamesNew} alt="Aptos Names" className="w-3 h-3 rounded-sm" />
                              )}
                              {cat}
                            </Badge>
                          ))}
                          
                           {(Array.isArray(result.club) ? result.club : [result.club]).map((clubName, clubIndex) => (
                            <Badge 
                              key={`club-${clubIndex}`}
                              className={cn(
                                "text-xs px-2 py-0.5 font-semibold rounded-full whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity",
                              clubName === 'Surname' && "bg-purple-600 text-white border-0",
                              clubName === 'DeFi' && "bg-green-600 text-white border-0",
                              clubName === 'Digits' && "bg-purple-600 text-white border-0",
                              clubName === 'Dev' && "bg-blue-600 text-white border-0",
                              clubName === 'Crypto' && "bg-gray-600 text-white border-0",
                              clubName === 'Letters' && "bg-gray-600 text-white border-0",
                              clubName === 'Startup' && "bg-orange-600 text-white border-0",
                              clubName === 'Artist' && "bg-pink-600 text-white border-0"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClubToggle(clubName);
                                handleSearch();
                              }}
                            >
                              {clubName}
                            </Badge>
                          ))}
                        </div>
                        
                         <Button 
                           className="w-full bg-gradient-to-r from-[#D4AF37] via-[#F7E06C] to-[#D4AF37] hover:from-[#C4A027] hover:via-[#E7D05C] hover:to-[#C4A027] text-black font-bold text-base py-6 rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.6)] transition-all duration-300 transform hover:scale-105 mt-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                           onClick={() => handleMint(result)}
                           disabled={result.name !== 'Smith.cash' || (displayQuery && userDomains.includes(`${displayQuery}.${result.name}`.toLowerCase()))}
                         >
                           {result.name !== 'Smith.cash' 
                             ? 'Coming Soon' 
                             : (displayQuery && userDomains.includes(`${displayQuery}.${result.name}`.toLowerCase())
                               ? 'Taken'
                               : t('mint_now')
                             )
                           }
                         </Button>
                      </div>
                    </div>

                    {/* Back of Card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
                      <div className="relative p-6 h-full flex flex-col min-h-[320px]">
                        <div className="flex justify-end mb-4 flex-shrink-0">
                          <button
                            onClick={() => handleFlipCard(index)}
                            className="w-10 h-10 rounded-full bg-gray-700/80 backdrop-blur-sm border border-gray-600 flex items-center justify-center hover:bg-gray-600/80 transition-all duration-300 hover:scale-110"
                          >
                            <X size={18} className="text-white" />
                          </button>
                        </div>

                        <div className="flex flex-col items-center text-center mb-4 flex-shrink-0">
                          <div className="relative mb-3">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-lg opacity-40"></div>
                            <div className="relative w-24 h-24 rounded-full border-3 border-[#D4AF37] overflow-hidden shadow-lg">
                              <img 
                                src={result.imageUrl} 
                                alt={result.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          
                           <h4 className="font-mono text-xl font-bold text-white leading-tight px-4 break-words flex items-center justify-center">
                             {displayQuery ? `${displayQuery}.${result.name}` : result.name}
                           </h4>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-2">
                          <p 
                            className="text-sm text-gray-300 leading-relaxed text-center break-words" 
                            dangerouslySetInnerHTML={{ __html: result.description }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
