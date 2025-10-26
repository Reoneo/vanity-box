import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import poapLogo from '@/assets/poap-logo.png';

interface PoapToken {
  id: string;
  event_id: number;
  token_id: string;
  event_name: string;
  event_description: string;
  event_image_url: string;
  event_year: number;
  event_start_date: string;
  event_end_date: string;
  owner: string;
  chain: string;
}

const WALLET_ADDRESS = '0x71ab0b01e3ff45551e25b208e2a90298f73f7040';

const PoapCollection: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [poaps, setPoaps] = useState<PoapToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoaps = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, fetch POAPs from the API
        const { data: apiData, error: apiError } = await supabase.functions.invoke('get-poap-data', {
          body: { walletAddress: WALLET_ADDRESS }
        });

        if (apiError) {
          console.error('Error fetching POAPs:', apiError);
          setError('Failed to fetch POAPs');
          setIsLoading(false);
          return;
        }

        if (apiData?.success && apiData.poaps) {
          setPoaps(apiData.poaps);
        } else {
          // If API call doesn't return POAPs, try fetching from database
          const { data: dbData, error: dbError } = await supabase
            .from('poap_tokens')
            .select('*')
            .eq('wallet_address', WALLET_ADDRESS.toLowerCase())
            .order('event_start_date', { ascending: false });

          if (dbError) {
            console.error('Database error:', dbError);
            setError('Failed to load POAPs from database');
          } else {
            setPoaps(dbData || []);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoaps();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="min-h-screen flex flex-col border-l-2 border-r-2 border-[#D4AF37]">
        <Header />
        
        <main className="flex-1 px-4 pt-24 md:pt-28 pb-20 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img src={poapLogo} alt="POAP" className="w-12 h-12 rounded-full" />
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent">
                  POAP Collection
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Wallet: {WALLET_ADDRESS.slice(0, 10)}...{WALLET_ADDRESS.slice(-8)}
              </p>
              <a
                href={`https://collectors.poap.xyz/scan/${WALLET_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-[#D4AF37] hover:underline"
              >
                View on POAP <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-20">
                <p className="text-red-500 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* POAPs Grid */}
            {!isLoading && !error && (
              <>
                <div className="mb-6 text-center">
                  <Badge variant="outline" className="text-lg px-4 py-2 border-[#D4AF37] text-[#D4AF37]">
                    {poaps.length} POAPs Collected
                  </Badge>
                </div>

                {poaps.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-gray-600 dark:text-gray-400">No POAPs found for this wallet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {poaps.map((poap) => (
                      <Card 
                        key={poap.token_id}
                        className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30"
                      >
                        <CardContent className="p-4">
                          <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-black/30">
                            <img
                              src={poap.event_image_url}
                              alt={poap.event_name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <h3 className="font-bold text-sm text-white mb-2 line-clamp-2">
                            {poap.event_name}
                          </h3>
                          {poap.event_year && (
                            <Badge variant="outline" className="text-xs border-[#D4AF37]/50 text-[#D4AF37]">
                              {poap.event_year}
                            </Badge>
                          )}
                          {poap.event_description && (
                            <p className="text-xs text-gray-400 mt-2 line-clamp-3">
                              {poap.event_description}
                            </p>
                          )}
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-xs text-gray-500">
                              Token #{poap.token_id}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 py-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] border-t-2 border-[#D4AF37] z-[9999] safe-area-inset-bottom">
          <div className="container mx-auto px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <LanguageSelector />
            </div>
            
            <div className="text-black absolute left-1/2 transform -translate-x-1/2 font-normal whitespace-nowrap">
              © 2025 vanity.box. All rights reserved.
            </div>
            
            <div className="flex items-center">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-7 h-7 flex items-center justify-center transition-all duration-300 hover:opacity-80"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-black" />
                ) : (
                  <Moon className="w-5 h-5 text-black" />
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PoapCollection;
