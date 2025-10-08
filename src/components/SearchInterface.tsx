import React, { useState, useEffect } from 'react';
import { Search, X, Filter, ChevronDown, Info, ArrowLeft, Globe, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
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
import aptosLogo from '@/assets/aptos-logo.png';
import aptosNamesIcon from '@/assets/aptos-names-icon.jpeg';
import aptosNamesLight from '@/assets/aptos-names-light.png';
import aptosNamesNew from '@/assets/aptos-names-new.jpeg';
import avvyLogo from '@/assets/avvy-logo.png';
import smithAptAvatar from '@/assets/smith-apt-avatar.png';
import termuxAvatar from '@/assets/termux-avatar.png';
import ensV2Logo from '@/assets/ens-v2-logo.png';

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

export const SearchInterface = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
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
  const [stablecoinNews, setStablecoinNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);

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
      setHasSearched(false);
      setEnsResults([]);
      setSearchQuery('');
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

  // Fetch stablecoin news on mount
  useEffect(() => {
    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-stablecoin-news');
        if (error) {
          console.error('Error fetching news:', error);
        } else {
          setStablecoinNews(data?.items || []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingNews(false);
      }
    };
    
    fetchNews();
  }, []);

  // Re-fetch and filter results when language changes
  useEffect(() => {
    if (hasSearched && searchQuery) {
      const allResults = getAllResultsData();
      const filteredResults = allResults.filter(result => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = result.name.toLowerCase().includes(searchLower) ||
                            result.description.toLowerCase().includes(searchLower);
        
        const matchesProtocol = filters.protocol.length === 0 || 
                               filters.protocol.some(p => {
                                 if (Array.isArray(result.category)) {
                                   return result.category.includes(p);
                                 }
                                 return result.category === p;
                               });
        
        const matchesClub = filters.club.length === 0 || 
                           filters.club.some(c => {
                             if (Array.isArray(result.club)) {
                               return result.club.includes(c);
                             }
                             return result.club === c;
                           });
        
        return matchesSearch && matchesProtocol && matchesClub;
      });
      setEnsResults(filteredResults);
    }
  }, [language]);

  const protocols = ['ENS', 'Aptos Names', 'Avvy Domains'];
  const clubs = ['100 club', 'emoji club', '999 club', '10k club'];

  const handleProtocolToggle = (protocol: string) => {
    setFilters(prev => ({
      ...prev,
      protocol: prev.protocol.includes(protocol)
        ? prev.protocol.filter(p => p !== protocol)
        : [...prev.protocol, protocol]
    }));
  };

  const handleClubToggle = (club: string) => {
    setFilters(prev => ({
      ...prev,
      club: prev.club.includes(club)
        ? prev.club.filter(c => c !== club)
        : [...prev.club, club]
    }));
  };

  const handleClearFilters = () => {
    setFilters({ protocol: [], club: [] });
  };

  const handleApplyFilters = () => {
    if (hasSearched) {
      handleSearch();
    }
    setShowFilterDropdown(false);
  };

  const getAllResults = (): ENSResult[] => {
    return [
      {
        name: "smith.cash",
        description: t('smith_cash_desc'),
        imageUrl: smithCashAvatar,
        price: 1,
        category: 'ENS',
        club: '100 club'
      },
      {
        name: "smith.apt",
        description: t('smith_apt_desc'),
        imageUrl: smithAptAvatar,
        price: 5,
        category: 'Aptos Names',
        club: '999 club'
      },
      {
        name: "termux.avax",
        description: t('termux_avax_desc'),
        imageUrl: termuxAvatar,
        price: 10,
        category: 'Avvy Domains',
        club: 'emoji club'
      }
    ];
  };

  const getSubdomainPrice = (subdomain: string): number => {
    const length = subdomain.length;
    if (length === 1) return 100;
    if (length === 2) return 50;
    if (length === 3) return 25;
    if (length === 4) return 15;
    if (length === 5) return 10;
    if (length >= 6 && length <= 9) return 5;
    return 1;
  };

  const getAllResultsData = () => {
    const allResults = [
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
        name: 'Smith.cash',
        description: t('desc_smith_cash'),
        imageUrl: smithCashAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Surname', 'DeFi']
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
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setHasSearched(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const allResults = getAllResultsData();
    
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
  const price = searchQuery ? getSubdomainPrice(searchQuery) : 0;
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
            subdomain={searchQuery ? `${searchQuery}.${selectedResult.name}` : selectedResult.name}
            price={price}
            resultAvatar={selectedResult.imageUrl}
          />
        ) : (
          <>
            {/* Main Heading - hidden when mint is open */}
            {!showMintInterface && <PersonalizedHeader user={null} />}
            
            {/* Search bar container - constrained width on all devices */}
            <div className="w-full max-w-md mx-auto">
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
                    <DropdownMenuContent align="start" className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
                      <DropdownMenuLabel>{t('filter_by')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('protocol')}</p>
                        {protocols.map(protocol => (
                          <DropdownMenuItem key={protocol} className="cursor-pointer">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                className="mr-2"
                                checked={filters.protocol.includes(protocol)}
                                onChange={() => handleProtocolToggle(protocol)}
                              />
                              {protocol}
                            </label>
                          </DropdownMenuItem>
                        ))}
                      </div>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('club')}</p>
                        {clubs.map(club => (
                          <DropdownMenuItem key={club} className="cursor-pointer">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                className="mr-2"
                                checked={filters.club.includes(club)}
                                onChange={() => handleClubToggle(club)}
                              />
                              {club}
                            </label>
                          </DropdownMenuItem>
                        ))}
                      </div>
                      <DropdownMenuSeparator />
                      <div className="flex justify-between px-2 py-1">
                        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                          {t('clear')}
                        </Button>
                        <Button size="sm" onClick={handleApplyFilters}>
                          {t('apply')}
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Input
                  placeholder={t('search_for_a_name')}
                  className="h-12 text-lg text-center bg-white border-black focus:border-black text-gray-600 placeholder-gray-400 pl-20 pr-20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <div className="absolute right-1 top-1 flex items-center gap-1 h-10">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setEnsResults([]);
                        setIsAvailable(null);
                        setHasSearched(false);
                      }}
                      className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4 text-black" />
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
            
            {/* Information Carousel - Shows when no search results and not showing My IDs */}
            {!hasSearched && !showMyIDs && (
              <div className="w-full max-w-2xl mx-auto mt-8 mb-8 px-4">
                <Carousel className="w-full">
                  <CarouselContent>
                    {/* ENS V2 Slide */}
                    <CarouselItem>
                      <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
                        <CardContent className="p-3 md:p-6">
                          <div className="flex justify-center mb-2 md:mb-4">
                            <img src={ensV2Logo} alt="ENS V2" className="h-8 md:h-12 w-auto" />
                          </div>
                          
                          <div className="space-y-1.5 md:space-y-2 text-white text-center">
                            <div>
                              <h3 className="font-semibold text-xs md:text-base mb-0.5 text-white">One Name, Any Chain</h3>
                              <p className="text-gray-300 text-[10px] md:text-xs leading-snug">Your ENS name and subdomains work across Ethereum L1 and all L2s, including World Chain.</p>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-xs md:text-base mb-0.5 text-white">Low Fees, Fast Updates</h3>
                              <p className="text-gray-300 text-[10px] md:text-xs leading-snug">Manage your name instantly with near-zero gas fees.</p>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-xs md:text-base mb-0.5 text-white">Full ENS Functionality</h3>
                              <p className="text-gray-300 text-[10px] md:text-xs leading-snug">Update profiles, records, wallets, and metadata — all from World App.</p>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-xs md:text-base mb-0.5 text-white">Future-Proof Identity</h3>
                              <p className="text-gray-300 text-[10px] md:text-xs leading-snug">ENS v2 uses the Namechain registry — making your identity portable and interoperable.</p>
                            </div>
                          </div>
                          
                          <div className="mt-2 md:mt-4 flex justify-center">
                            <a
                              href="https://ens.domains/ensv2"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 md:px-4 md:py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg text-xs md:text-sm"
                            >
                              Learn More
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>

                     {/* Stablecoin News Slide */}
                    <CarouselItem>
                      <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
                        <CardContent className="p-3 md:p-6">
                          <div className="flex justify-center mb-3 md:mb-4">
                            <h2 className="text-base md:text-2xl font-bold text-[#D4AF37]">Stablecoin News</h2>
                          </div>
                          
                          {loadingNews ? (
                            <div className="text-center text-white text-xs md:text-sm py-4">Loading latest news...</div>
                          ) : stablecoinNews.length > 0 ? (
                            <div className="space-y-2 md:space-y-3 max-h-[280px] md:max-h-[320px] overflow-y-auto">
                              {stablecoinNews.slice(0, 8).map((item, idx) => (
                                <div key={idx} className="border-b border-gray-700 pb-2">
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block group"
                                  >
                                    <h3 className="font-semibold text-[10px] md:text-sm mb-1 text-white group-hover:text-[#D4AF37] transition-colors flex items-start gap-1">
                                      <span className="flex-1">{item.title}</span>
                                      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                                    </h3>
                                    <p className="text-gray-400 text-[9px] md:text-xs">
                                      {item.source} • {new Date(item.time).toLocaleDateString()}
                                    </p>
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-white text-xs md:text-sm py-4">
                              No recent stablecoin news available
                            </div>
                          )}
                          
                          <div className="mt-3 md:mt-4 flex justify-center">
                            <a
                              href="https://www.coindesk.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 md:px-4 md:py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg text-xs md:text-sm"
                            >
                              More on CoinDesk
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>

                    {/* Digital ID News Slide */}
                    <CarouselItem>
                      <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
                        <CardContent className="p-3 md:p-6">
                          <div className="flex justify-center mb-2 md:mb-4">
                            <h2 className="text-base md:text-2xl font-bold text-[#D4AF37]">Digital ID News</h2>
                          </div>
                          
                          <div className="space-y-1.5 md:space-y-2 text-white text-center">
                            <div>
                              <h3 className="font-semibold text-xs md:text-base mb-0.5 text-white">World ID Reaches 10M Verifications</h3>
                              <p className="text-purple-100 text-[10px] md:text-xs leading-snug">World ID surpasses 10 million verified humans, establishing the largest proof-of-personhood network.</p>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-xs md:text-base mb-0.5 text-white">ENS Names as Digital Identity</h3>
                              <p className="text-purple-100 text-[10px] md:text-xs leading-snug">ENS names are becoming the standard for Web3 identity, linking wallets, social profiles, and metadata.</p>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-xs md:text-base mb-0.5 text-white">Zero-Knowledge Proofs Go Mainstream</h3>
                              <p className="text-purple-100 text-[10px] md:text-xs leading-snug">ZK technology enables privacy-preserving identity verification without exposing personal data.</p>
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-xs md:text-base mb-0.5 text-white">Decentralized Identity Standards</h3>
                              <p className="text-purple-100 text-[10px] md:text-xs leading-snug">New W3C standards for decentralized identifiers (DIDs) improve interoperability across platforms.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  </CarouselContent>
                  
                  <CarouselPrevious className="hidden md:flex -left-12 bg-white/10 border-white/20 hover:bg-white/20 text-white" />
                  <CarouselNext className="hidden md:flex -right-12 bg-white/10 border-white/20 hover:bg-white/20 text-white" />
                </Carousel>
                
                {/* Swipe Indicator */}
                <div className="flex justify-center mt-3 gap-2 items-center">
                  <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground animate-pulse" />
                  <p className="text-[10px] md:text-xs text-muted-foreground">Swipe for more info</p>
                  <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground animate-pulse" />
                </div>
              </div>
            )}

            {/* My ID's Section */}
            {walletAddress && showMyIDs && (
              <div className="w-full sm:max-w-3xl sm:mx-auto mt-8">
                <Button
                  onClick={() => setShowMyIDs(false)}
                  variant="outline"
                  className="mb-4 border-[#D4AF37] text-gray-900 dark:text-white hover:bg-[#D4AF37]/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Search
                </Button>
                <UserDomainsDisplay walletAddress={walletAddress} />
              </div>
            )}

            {/* Results container - same width as search bar */}
            <div className="w-full sm:max-w-3xl sm:mx-auto">
              {hasSearched && ensResults.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-500">
            {ensResults.map((result, index) => {
              const isFlipped = flippedCards.has(index);
              return (
                <div key={index} className="perspective-1000 min-h-[320px]">
                  <div className={`relative w-full h-full min-h-[320px] transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front of Card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_50px_rgba(212,175,55,0.3)] transition-all duration-500 hover:scale-[1.02]">
                      <button
                        onClick={() => handleFlipCard(index)}
                        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-gray-700/80 backdrop-blur-sm border border-gray-600 flex items-center justify-center hover:bg-gray-600/80 transition-all duration-300 hover:scale-110"
                      >
                        <Info size={18} className="text-white" />
                      </button>
                      
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
                          {searchQuery ? `${searchQuery}.${result.name}` : result.name}
                        </h3>
                        
                        <div className="flex items-center justify-center gap-1 mb-2 overflow-x-auto max-w-full flex-nowrap">
                          {(Array.isArray(result.category) ? result.category : [result.category]).map((cat, catIndex) => (
                            <Badge 
                              key={`cat-${catIndex}`}
                              className={cn(
                                "text-xs px-2 py-0.5 flex items-center gap-1 font-semibold rounded-full border whitespace-nowrap",
                                cat === 'ENS' && "bg-transparent text-white border-[#D4AF37]",
                                cat === 'DNS' && "bg-transparent text-white border-blue-500",
                                cat === 'Aptos Names' && "bg-transparent text-white border-purple-500"
                              )}
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
                                "text-xs px-2 py-0.5 font-semibold rounded-full whitespace-nowrap",
                                clubName === 'Surname' && "bg-purple-600 text-white border-0",
                                clubName === 'DeFi' && "bg-green-600 text-white border-0",
                                clubName === 'Digits' && "bg-purple-600 text-white border-0",
                                clubName === 'Dev' && "bg-blue-600 text-white border-0",
                                clubName === 'Crypto' && "bg-gray-600 text-white border-0",
                                clubName === 'Letters' && "bg-gray-600 text-white border-0"
                              )}
                            >
                              {clubName}
                            </Badge>
                          ))}
                        </div>
                        
                        <Button 
                          className="w-full bg-gradient-to-r from-[#D4AF37] via-[#F7E06C] to-[#D4AF37] hover:from-[#C4A027] hover:via-[#E7D05C] hover:to-[#C4A027] text-black font-bold text-base py-6 rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.6)] transition-all duration-300 transform hover:scale-105 mt-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          onClick={() => handleMint(result)}
                          disabled={result.name !== 'Smith.cash'}
                        >
                          {result.name === 'Smith.cash' ? t('mint_now') : 'Coming Soon'}
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
                            {searchQuery ? `${searchQuery}.${result.name}` : result.name}
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
