import React, { useState } from 'react';
import { Search, Globe, Zap, X, Filter, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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

export interface FilterState {
  protocol: string[];
  club: string[];
}

interface ENSResult {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  category: string;
}

export const SearchInterface = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ protocol: [], club: [] });
  const [ensResults, setEnsResults] = useState<ENSResult[]>([]);

  const protocols = ['ENS', 'Aptos Names', 'Avax Name Service'];
  const clubs = ['DeFi', 'Digits', 'Influencers', 'Letters', 'Surname']; // Alphabetical order

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
        description: '30315 is a ZIP code in Atlanta, Georgia. It covers neighbourhoods like Lakewood Heights, South Atlanta, and parts of Grant Park.',
        imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/f4ba02d96f0f9edccaee4a242f0fdf/82f4ba02d96f0f9edccaee4a242f0fdf.svg',
        price: 1,
        category: 'ENS',
        club: 'Digits'
      },
      {
        name: 'MexiPay.eth',
        description: 'A Mexican influenced digital identity for Web3 and stablecoin payments — enabling secure, accessible subdomains for everyday use.',
        imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/1b420ade2f21c60b34fe53f761d09a/551b420ade2f21c60b34fe53f761d09a.svg',
        price: 5,
        category: 'ENS',
        club: 'DeFi'
      },
      {
        name: 'GuavaPay.eth',
        description: 'A Web3-native alternative to Apple Pay — providing a digital identity and subdomains for seamless payments and stablecoin transactions.',
        imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/44d2edb2482769d623f27e7c94cd46/7044d2edb2482769d623f27e7c94cd46.svg',
        price: 5,
        category: 'ENS',
        club: 'DeFi'
      },
      {
        name: 'EncryptedDegen.eth',
        description: 'UI/UX Designer & Developer | Building the web3 social graph @efp.eth.',
        imageUrl: 'https://raw2.seadn.io/ethereum/0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85/4ce70ef4eb1b2e7094cc4c7fee38e0/054ce70ef4eb1b2e7094cc4c7fee38e0.svg',
        price: 5,
        category: 'ENS',
        club: 'Influencers'
      },
      {
        name: 'Caveman.eth',
        description: 'Bringing onchain social profiles to 300 million EVM accounts, one follow at a time @efp.eth | Aaron | Onchain Maximilist | Prev: Sat.eth.',
        imageUrl: 'https://raw2.seadn.io/ethereum/0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85/31c489e1c506b192e49026b893130b/2e31c489e1c506b192e49026b893130b.svg',
        price: 5,
        category: 'ENS',
        club: 'Influencers'
      }
    ];
    return allResults;
  };

  const handleSearch = async () => {
    setIsLoading(true);
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const allResults = getAllResults();
    
    // If no filters are applied, show all results
    if (filters.protocol.length === 0 && filters.club.length === 0) {
      setEnsResults(allResults);
    } else {
      // Filter results based on selected filters
      const filteredResults = allResults.filter(result => {
        const protocolMatch = filters.protocol.length === 0 || filters.protocol.includes(result.category);
        const clubMatch = filters.club.length === 0 || filters.club.includes(result.club);
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
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Filters</span>
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
                
                <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">Protocol</DropdownMenuLabel>
                {protocols.map((protocol) => (
                  <DropdownMenuItem
                    key={protocol}
                    onClick={() => handleProtocolToggle(protocol)}
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
                      {protocol}
                    </div>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />
                
                <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">Club</DropdownMenuLabel>
                {clubs.map((club) => (
                  <DropdownMenuItem
                    key={club}
                    onClick={() => handleClubToggle(club)}
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
            placeholder="Search for a name"
            className="h-12 text-lg text-center bg-white border-gray-300 focus:border-gray-300 text-gray-600 placeholder-gray-400 pl-20 pr-20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div className="absolute right-1 top-1 flex items-center gap-1 h-10">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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
        
        {/* ENS Results */}
        {ensResults.length > 0 && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-bottom duration-300">
            {ensResults.map((result, index) => (
              <Card key={index} className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <img 
                        src={result.imageUrl} 
                        alt={result.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37]"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <img 
                          src={ensLogoBlue} 
                          alt="ENS" 
                          className="w-5 h-5 dark:hidden"
                        />
                        <img 
                          src={ensLogoWhite} 
                          alt="ENS" 
                          className="w-5 h-5 hidden dark:block"
                        />
                        <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                          {searchQuery ? `${searchQuery}.${result.name}` : result.name}
                        </span>
                        <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                          {result.category}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {result.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">${searchQuery ? getSubdomainPrice(searchQuery) : result.price} USD</span>
                        </div>
                      </div>
                      
                      {/* Mint Button */}
                      <Button 
                        size="sm" 
                        className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-medium"
                        onClick={() => setShowMintModal(true)}
                      >
                        Mint Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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