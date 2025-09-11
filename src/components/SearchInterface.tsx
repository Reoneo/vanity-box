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
      <Card className="p-6 shadow-xl bg-card/50 backdrop-blur-sm border-primary/20">
        <CardContent className="p-0 space-y-6">
          {/* Search Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Search ENS Subdomains</h2>
            <p className="text-muted-foreground">Find your perfect Web3 identity on vanity.₿ox</p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Enter subdomain name"
                  className="pl-10 h-12 text-lg border-primary/30 focus:border-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                  .vanity.₿ox
                </span>
              </div>
              <Button 
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isLoading}
                className="h-12 px-6"
                variant="default"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
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

          {/* Quick Suggestions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['alice', 'bob', 'crypto', 'web3'].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setSearchQuery(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <SubdomainMintModal
        isOpen={showMintModal}
        onClose={() => setShowMintModal(false)}
        subdomain={searchQuery}
        price={price}
      />
    </>
  );
};