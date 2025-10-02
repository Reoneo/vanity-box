import React, { useState } from 'react';
import { Search, Zap, X, Filter, ChevronDown, Info, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { SubdomainMintModal } from '@/components/SubdomainMintModal';
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
import smithAptAvatar from '@/assets/smith-apt-avatar.png';
import termuxAvatar from '@/assets/termux-avatar.png';

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
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ protocol: [], club: [] });
  const [ensResults, setEnsResults] = useState<ENSResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const protocols = ['ENS', 'DNS', 'Aptos Names', 'Avax Name Service'];
  const clubs = ['Crypto', 'DeFi', 'Dev', 'Digits', 'Letters', 'Surname']; // Alphabetical order

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
    setShowFilterDropdown(false);
    // Trigger search with current filters
    if (filters.protocol.length > 0 || filters.club.length > 0) {
      handleSearch();
    }
  };

  const getAllResults = () => {
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
        name: 'smith.cash',
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
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const allResults = getAllResults();
    
    // If no filters are applied, show all results
    if (filters.protocol.length === 0 && filters.club.length === 0) {
      setEnsResults(allResults);
    } else {
      // Filter results based on selected filters
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
    
    // For demo purposes, make it available if it doesn't contain "taken"
    if (searchQuery) {
      setIsAvailable(!searchQuery.toLowerCase().includes('taken'));
    }
    setIsLoading(false);
  };

  const handleMint = () => {
    setShowMintModal(true);
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
      {/* Blur overlay when filter dropdown is open */}
      {showFilterDropdown && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
      )}
      
      <div className="w-full">
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
                <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('filters')}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handleClearFilters}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <X className="w-4 h-4 text-black dark:text-white" />
                    </button>
                    <button 
                      onClick={handleApplyFilters}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <div className="w-4 h-4 flex items-center justify-center text-[#D4AF37] text-xs font-bold">✓</div>
                    </button>
                  </div>
                </div>
                
                <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">{t('protocol')}</DropdownMenuLabel>
                {protocols.map((protocol) => (
                  <DropdownMenuItem
                    key={protocol}
                    onClick={(e) => {
                      e.preventDefault();
                      handleProtocolToggle(protocol);
                    }}
                    className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 border rounded ${
                        filters.protocol.includes(protocol) 
                          ? 'bg-[#D4AF37] border-[#D4AF37]' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {filters.protocol.includes(protocol) && (
                          <div className="w-full h-full flex items-center justify-center text-black text-xs">✓</div>
                        )}
                      </div>
                      {protocol === 'ENS' && (
                        <img 
                          src={ensLogoBlue} 
                          alt="ENS" 
                          className="w-4 h-4 dark:hidden"
                        />
                      )}
                      {protocol === 'ENS' && (
                        <img 
                          src={ensLogoWhite} 
                          alt="ENS" 
                          className="w-4 h-4 hidden dark:block"
                        />
                      )}
                      {protocol === 'DNS' && (
                        <Globe className="w-4 h-4 text-blue-500" />
                      )}
                      {protocol === 'Aptos Names' && (
                        <img 
                          src={aptosNamesIcon} 
                          alt="Aptos Names" 
                          className="w-4 h-4 rounded-sm"
                        />
                      )}
                      {protocol}
                    </div>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />
                
                <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">{t('club')}</DropdownMenuLabel>
                {clubs.map((club) => (
                  <DropdownMenuItem
                    key={club}
                    onClick={(e) => {
                      e.preventDefault();
                      handleClubToggle(club);
                    }}
                    className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 border rounded ${
                        filters.club.includes(club) 
                          ? 'bg-[#D4AF37] border-[#D4AF37]' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {filters.club.includes(club) && (
                          <div className="w-full h-full flex items-center justify-center text-black text-xs">✓</div>
                        )}
                      </div>
                      {club}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Input
            placeholder={t('search_for_a_name')}
            className="h-12 text-lg text-center bg-white border-gray-300 focus:border-gray-300 text-gray-600 placeholder-gray-400 pl-20 pr-20"
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
        
        {hasSearched && ensResults.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-bottom duration-500">
            {ensResults.map((result, index) => {
              const isFlipped = flippedCards.has(index);
              return (
                <div key={index} className="perspective-1000 h-[280px]">
                  <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front of Card */}
                    <Card className={`absolute inset-0 w-full h-full backface-hidden overflow-hidden bg-gradient-to-br from-white/95 via-white to-amber-50/30 dark:from-gray-900/95 dark:via-gray-900 dark:to-amber-900/10 border-2 border-[#D4AF37]/30 shadow-[0_8px_32px_rgba(212,175,55,0.12)] hover:shadow-[0_16px_48px_rgba(212,175,55,0.25)] transition-all duration-500 hover:scale-[1.01] hover:border-[#D4AF37]/50 backdrop-blur-sm`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 via-transparent to-[#D4AF37]/5"></div>
                      
                      {/* Info Button - Top Right */}
                      <button
                        onClick={() => handleFlipCard(index)}
                        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 hover:scale-110 hover:shadow-lg"
                      >
                        <Info size={14} className="text-black dark:text-white" />
                      </button>
                      
                      <CardContent className="relative p-4 h-full flex flex-col">
                        <div className="flex flex-col items-center text-center h-full">
                          {/* Centered Avatar */}
                          <div className="relative flex-shrink-0 mb-2">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-sm opacity-30"></div>
                            <img 
                              src={result.imageUrl} 
                              alt={result.name}
                              className="relative w-16 h-16 rounded-full object-cover border-3 border-[#D4AF37] shadow-lg ring-2 ring-[#D4AF37]/20"
                            />
                          </div>
                          
                          {/* Centered Subdomain */}
                          <h3 className="font-mono text-lg md:text-xl font-bold text-gray-900 dark:text-white break-words leading-tight flex-shrink-0 mb-2" style={{ textShadow: '0 0 8px rgba(212,175,55,0.4)' }}>
                            {searchQuery ? `${searchQuery}.${result.name}` : result.name}
                          </h3>
                          
                          {/* First Row: Centered Protocol and Category Badges */}
                          <div className="flex items-center justify-center gap-1.5 flex-wrap min-h-[32px] flex-shrink-0 mb-2">
                            {/* Protocol Badges */}
                            {(Array.isArray(result.category) ? result.category : [result.category]).map((cat, catIndex) => (
                              <Badge 
                                key={`cat-${catIndex}`}
                                variant="secondary" 
                                className={cn(
                                  "text-xs px-2 py-1 flex items-center gap-1 backdrop-blur-sm font-semibold shadow-sm",
                                  cat === 'ENS' && "bg-transparent text-black dark:text-white border-2 border-[#D4AF37] animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(212,175,55,0.5)]",
                                  cat === 'DNS' && "bg-transparent text-black dark:text-white border-2 border-blue-500 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(59,130,246,0.5)]",
                                  cat === 'Aptos Names' && "bg-transparent text-purple-600 dark:text-white border-2 border-purple-500 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                )}
                              >
                                {cat === 'ENS' && (
                                  <>
                                    <img src={ensLogoBlue} alt="ENS" className="w-3 h-3 dark:hidden" />
                                    <img src={ensLogoWhite} alt="ENS" className="w-3 h-3 hidden dark:block" />
                                  </>
                                )}
                                {cat === 'DNS' && <Globe className="w-3 h-3 text-blue-500" />}
                                {cat === 'Aptos Names' && <img src={aptosNamesIcon} alt="Aptos Names" className="w-3 h-3 rounded-sm" />}
                                {cat}
                              </Badge>
                            ))}
                            
                            {/* Club Badges */}
                            {(Array.isArray(result.club) ? result.club : [result.club]).map((clubName, clubIndex) => (
                              <Badge 
                                key={`club-${clubIndex}`}
                                variant="outline" 
                                className={cn(
                                  "text-xs px-2 py-1 font-medium shadow-sm",
                                  clubName === 'Surname' && "bg-purple-600 text-white border-purple-600",
                                  clubName === 'DeFi' && "bg-green-600 text-white border-green-600",
                                  clubName === 'Influencers' && "bg-blue-600 text-white border-blue-600",
                                  clubName === 'Digits' && "bg-purple-600 text-white border-purple-600",
                                  clubName === 'Dev' && "bg-blue-600 text-white border-blue-600",
                                  clubName === 'Crypto' && "text-gray-600 dark:text-gray-400 border-gray-300/60 dark:border-gray-600/60 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm",
                                  clubName === 'Letters' && "text-gray-600 dark:text-gray-400 border-gray-300/60 dark:border-gray-600/60 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                                )}
                              >
                                {clubName}
                              </Badge>
                            ))}
                          </div>
                          
                          
                          {/* Mint Button Section */}
                          <div className="flex-1 flex items-end justify-center w-full mt-auto">
                            <Button 
                              size="default" 
                              className="bg-gradient-to-r from-[#D4AF37] via-[#F7E06C] to-[#D4AF37] hover:from-[#C4A027] hover:via-[#E7D05C] hover:to-[#C4A027] text-black font-bold px-8 py-2 text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-[#D4AF37]/30 hover:border-[#D4AF37]/50"
                              onClick={() => setShowMintModal(true)}
                            >
                              {t('mint_now')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Back of Card */}
                    <Card className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 overflow-hidden bg-gradient-to-br from-amber-50/95 via-amber-50 to-white/95 dark:from-amber-900/95 dark:via-amber-900 dark:to-gray-900/95 border-2 border-[#D4AF37]/50 shadow-[0_8px_32px_rgba(212,175,55,0.2)] backdrop-blur-sm`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-[#D4AF37]/10"></div>
                      <CardContent className="relative p-4 h-full flex flex-col">
                        {/* Close Button */}
                        <div className="flex justify-end mb-2 flex-shrink-0">
                          <button
                            onClick={() => handleFlipCard(index)}
                            className="w-8 h-8 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-[#F7E06C]/20 border border-[#D4AF37]/40 flex items-center justify-center hover:from-[#D4AF37]/30 hover:to-[#F7E06C]/30 transition-all duration-300 hover:scale-110 hover:shadow-lg backdrop-blur-sm"
                          >
                            <X size={14} className="text-[#D4AF37]" />
                          </button>
                        </div>

                        {/* Avatar and Name */}
                        <div className="flex flex-col items-center text-center mb-2 flex-shrink-0">
                          <div className="relative mb-2">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-sm opacity-30"></div>
                            <img 
                              src={result.imageUrl} 
                              alt={result.name}
                              className="relative w-16 h-16 rounded-full object-cover border-3 border-[#D4AF37] shadow-lg ring-2 ring-[#D4AF37]/20"
                            />
                          </div>
                          
                          <h4 className="font-mono text-lg md:text-xl font-bold text-gray-900 dark:text-white break-words leading-tight w-full" style={{ textShadow: '0 0 8px rgba(212,175,55,0.4)' }}>
                            {searchQuery ? `${searchQuery}.${result.name}` : result.name}
                          </h4>
                        </div>
                        
                        {/* Description - Fills remaining space */}
                        <div className="flex-1 overflow-y-auto px-2 min-h-0">
                          <p 
                            className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium text-center break-words whitespace-normal" 
                            dangerouslySetInnerHTML={{ __html: result.description }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <SubdomainMintModal
        isOpen={showMintModal}
        onClose={() => setShowMintModal(false)}
        subdomain={searchQuery}
        price={price}
      />
    </>
  );
};