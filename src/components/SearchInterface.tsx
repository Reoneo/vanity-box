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
  const [filters, setFilters] = useState<FilterState>({ protocol: [], club: [] });
  const [ensResults, setEnsResults] = useState<ENSResult[]>([]);

  const protocols = ['ENS', 'Aptos Names', 'Avax Name Service'];
  const clubs = ['ABC', 'Digits', 'Surname', 'DeFi'];

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    
    // Check if filters include ENS
    const showENSResults = filters.protocol.includes('ENS');
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (showENSResults) {
      const results = [];
      
      if (filters.club.includes('Digits')) {
        results.push({
          name: '30315.eth',
          description: '30315 is a ZIP code in Atlanta, Georgia. It covers neighbourhoods like Lakewood Heights, South Atlanta, and parts of Grant Park.',
          imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/f4ba02d96f0f9edccaee4a242f0fdf/82f4ba02d96f0f9edccaee4a242f0fdf.svg',
          price: 1,
          category: 'ENS'
        });
      }
      
      if (filters.club.includes('DeFi')) {
        results.push({
          name: 'MexiPay.eth',
          description: 'A Mexican influenced digital identity for Web3 and stablecoin payments — enabling secure, accessible subdomains for everyday use.',
          imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/1b420ade2f21c60b34fe53f761d09a/551b420ade2f21c60b34fe53f761d09a.svg',
          price: 5,
          category: 'ENS'
        });
        results.push({
          name: 'GuavaPay.eth',
          description: 'A Web3-native alternative to Apple Pay — providing a digital identity and subdomains for seamless payments and stablecoin transactions.',
          imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/44d2edb2482769d623f27e7c94cd46/7044d2edb2482769d623f27e7c94cd46.svg',
          price: 5,
          category: 'ENS'
        });
      }
      
      setEnsResults(results);
    } else {
      setEnsResults([]);
    }
    
    // For demo purposes, make it available if it doesn't contain "taken"
    setIsAvailable(!searchQuery.toLowerCase().includes('taken'));
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
      <div className="w-full">
        <div className="relative">
          <div className="absolute left-1 top-1 z-10 h-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black border-[#D4AF37]"
                >
                  <Filter className="w-4 h-4" />
                  {totalFilters > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-black text-white">
                      {totalFilters}
                    </Badge>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">Protocol</DropdownMenuLabel>
                {protocols.map((protocol) => (
                  <DropdownMenuItem
                    key={protocol}
                    onClick={() => handleProtocolToggle(protocol)}
                    className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-2">
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
                      <div className={`w-4 h-4 border rounded ${
                        filters.protocol.includes(protocol) 
                          ? 'bg-[#D4AF37] border-[#D4AF37]' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {filters.protocol.includes(protocol) && (
                          <div className="w-full h-full flex items-center justify-center text-black text-xs">✓</div>
                        )}
                      </div>
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
        
        {/* ENS Results from Filters */}
        {hasFilters && ensResults.length > 0 && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-bottom duration-300">
            {ensResults.map((result, index) => (
              <Card key={index} className="relative overflow-hidden">
                <div 
                  className="absolute inset-0 blur-sm opacity-30"
                  style={{
                    backgroundImage: `url(${result.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <CardContent className="relative p-4 bg-black/40">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={ensLogoWhite} 
                        alt="ENS" 
                        className="w-4 h-4"
                      />
                      <span className="font-mono text-xl font-semibold text-white">{result.name}</span>
                      <Badge variant="secondary" className="bg-white/20 text-white">{result.category}</Badge>
                    </div>
                    <p className="text-sm text-white/90">{result.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-white/90">
                        <Zap className="w-3 h-3" />
                        <span>${result.price} USD</span>
                      </div>
                      <Button size="sm" className="gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black">
                        <Zap className="w-4 h-4" />
                        Mint Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-bottom duration-300">
            {ensResults.length > 0 && ensResults.map((result, index) => (
              <div key={index} className={cn(
                "p-4 rounded-lg border-2 transition-colors",
                "border-success/50 bg-success/5"
              )}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <img 
                        src={ensLogoBlue} 
                        alt="ENS" 
                        className="w-4 h-4 dark:hidden"
                      />
                      <img 
                        src={ensLogoWhite} 
                        alt="ENS" 
                        className="w-4 h-4 hidden dark:block"
                      />
                      <span className="font-mono text-lg">{searchQuery}.{result.name}</span>
                      <Badge variant="default">Available</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="w-3 h-3" />
                      <span>${price} USD</span>
                    </div>
                  </div>
                  <Button onClick={handleMint} className="gap-2">
                    <Zap className="w-4 h-4" />
                    Mint Now
                  </Button>
                </div>
              </div>
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