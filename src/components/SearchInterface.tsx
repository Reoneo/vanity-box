import React, { useState } from 'react';
import { Search, Globe, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SubdomainMintModal } from '@/components/SubdomainMintModal';

export const SearchInterface = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);

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
    // Simulate availability check
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, make it available if it doesn't contain "taken"
    setIsAvailable(!searchQuery.toLowerCase().includes('taken'));
    setIsLoading(false);
  };

  const handleMint = () => {
    setShowMintModal(true);
  };

  const searchResults = searchQuery && !isLoading && isAvailable !== null;
  const price = searchQuery ? getSubdomainPrice(searchQuery) : 0;

  return (
    <>
      <div className="w-full">
        <Input
          placeholder="Search for a name"
          className="h-12 text-lg text-center border-primary/30 focus:border-primary bg-card/50 backdrop-blur-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        
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