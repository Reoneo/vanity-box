import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  name: string;
  type: 'ens' | 'unstoppable' | 'lens' | 'farcaster';
  address: string;
  avatar?: string;
  verified?: boolean;
  description?: string;
}

export const SearchInterface: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      // Mock results - in real app, this would call Web3 name resolution APIs
      const mockResults: SearchResult[] = [
        {
          name: searchQuery + '.eth',
          type: 'ens',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          verified: true,
          description: 'Ethereum Name Service domain'
        },
        {
          name: searchQuery + '.crypto',
          type: 'unstoppable',
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          verified: false,
          description: 'Unstoppable Domains'
        }
      ];
      setResults(searchQuery ? mockResults : []);
      setIsSearching(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ens': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'unstoppable': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'lens': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'farcaster': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="text"
            placeholder="Search for a name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-20 h-14 text-lg border-2 border-border/50 rounded-xl bg-card/50 backdrop-blur-sm focus:border-primary transition-all duration-200"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10"
            variant="default"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Search Results</h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={index} className="border border-border/50 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold text-sm">
                          {result.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{result.name}</span>
                          {result.verified && (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                          <Badge className={cn("text-xs", getTypeColor(result.type))}>
                            {result.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{result.address.slice(0, 20)}...</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyAddress(result.address)}
                          >
                            {copiedAddress === result.address ? (
                              <CheckCircle className="w-3 h-3 text-success" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchQuery && results.length === 0 && !isSearching && (
        <Card className="border border-border/50">
          <CardContent className="p-8 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No results found</h3>
              <p className="text-muted-foreground">Try searching for a different Web3 identity or domain name.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};