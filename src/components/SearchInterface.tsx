import React, { useState } from 'react';
import { Search, Globe, Zap, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SubdomainMintModal } from '@/components/SubdomainMintModal';
import { FilterButton, FilterState } from '@/components/FilterButton';

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    
    // Check if filters include ENS and Digits to show the special result
    const showSpecialResult = filters.protocol.includes('ENS') && filters.club.includes('Digits');
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (showSpecialResult) {
      setEnsResults([{
        name: '30315.eth',
        description: '30315 is a ZIP code in Atlanta, Georgia. It covers neighbourhoods like Lakewood Heights, South Atlanta, and parts of Grant Park.',
        imageUrl: 'https://raw2.seadn.io/ethereum/0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401/f4ba02d96f0f9edccaee4a242f0fdf/82f4ba02d96f0f9edccaee4a242f0fdf.svg',
        price: 1,
        category: 'ENS'
      }]);
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

  return (
    <>
      <div className="w-full">
        <div className="flex gap-2">
          <FilterButton filters={filters} onFilterChange={setFilters} />
          <div className="relative flex-1">
            <Input
              placeholder="Search for a name"
              className="h-12 text-lg text-center bg-white border-gray-300 focus:border-gray-300 text-gray-600 placeholder-gray-400 pl-6 pr-20"
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
        </div>
        
        {/* ENS Results from Filters */}
        {hasFilters && ensResults.length > 0 && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-bottom duration-300">
            {ensResults.map((result, index) => (
              <Card key={index} className="p-4">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <img 
                      src={result.imageUrl} 
                      alt={result.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-semibold">{result.name}</span>
                        <Badge variant="secondary">{result.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Zap className="w-3 h-3" />
                          <span>${result.price} USD</span>
                        </div>
                        <Button size="sm" className="gap-2">
                          <Zap className="w-4 h-4" />
                          Mint Now
                        </Button>
                      </div>
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
            <div className={cn(
              "p-4 rounded-lg border-2 transition-colors",
              isAvailable 
                ? "border-success/50 bg-success/5" 
                : "border-destructive/50 bg-destructive/5"
            )}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-lg">{searchQuery}.vanity.₿ox</span>
                    <Badge variant={isAvailable ? "default" : "destructive"}>
                      {isAvailable ? "Available" : "Taken"}
                    </Badge>
                  </div>
                  {isAvailable && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="w-3 h-3" />
                      <span>${price} USD</span>
                    </div>
                  )}
                </div>
                {isAvailable && (
                  <Button onClick={handleMint} className="gap-2">
                    <Zap className="w-4 h-4" />
                    Mint Now
                  </Button>
                )}
              </div>
            </div>
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