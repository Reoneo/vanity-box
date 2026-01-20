import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Failed to parse request body:', e);
      body = {};
    }
    
    const { walletAddress: rawWalletAddress } = body;
    
    // Sanitize walletAddress - handle MiniKit's undefined object format
    const walletAddress = 
      rawWalletAddress && 
      typeof rawWalletAddress === 'object' && 
      (rawWalletAddress as any)?._type === 'undefined'
        ? undefined
        : typeof rawWalletAddress === 'string' && 
          rawWalletAddress !== 'undefined' && 
          rawWalletAddress.trim() !== ''
        ? rawWalletAddress
        : undefined;
    
    if (!walletAddress) {
      console.log('No valid walletAddress provided, returning empty array');
      return new Response(JSON.stringify({ nfts: [], attempted: true, errorsByChain: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('🖼️ Fetching ALL OpenSea NFTs for:', walletAddress);
    
    const OPENSEA_API_KEY = Deno.env.get('OPENSEA_API_KEY');
    
    if (!OPENSEA_API_KEY) {
      console.error('❌ OPENSEA_API_KEY not configured');
      return new Response(JSON.stringify({ 
        nfts: [], 
        attempted: true, 
        errorsByChain: { all: 'API key not configured' } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OpenSea supported chains
    const chains = [
      'ethereum',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
      'avalanche',
      'bsc',
      'klaytn',
      'zora'
    ];

    let allNfts: any[] = [];
    const errorsByChain: Record<string, string> = {};
    const fetchedChains: string[] = [];
    const MAX_TOTAL_NFTS = 1000; // Safety limit
    const MAX_PAGES_PER_CHAIN = 10; // Safety limit per chain
    const LIMIT_PER_REQUEST = 200; // OpenSea max
    const INTER_CHAIN_DELAY = 100; // Small delay between chains to avoid rate limiting

    // Fetch NFTs from all supported chains with pagination
    for (const chain of chains) {
      if (allNfts.length >= MAX_TOTAL_NFTS) {
        console.log(`⚠️ Reached max NFT limit (${MAX_TOTAL_NFTS}), stopping fetch`);
        break;
      }

      let chainCursor: string | null = null;
      let hasMore = true;
      let pageCount = 0;
      let retryCount = 0;
      const MAX_RETRIES = 2;

      while (hasMore && pageCount < MAX_PAGES_PER_CHAIN && allNfts.length < MAX_TOTAL_NFTS) {
        try {
          let url = `https://api.opensea.io/api/v2/chain/${chain}/account/${walletAddress}/nfts?limit=${LIMIT_PER_REQUEST}`;
          if (chainCursor) {
            url += `&next=${encodeURIComponent(chainCursor)}`;
          }
          
          console.log(`📡 Fetching from OpenSea (${chain}) page ${pageCount + 1}...`);
          
          const response = await fetch(url, {
            headers: {
              'accept': 'application/json',
              'x-api-key': OPENSEA_API_KEY,
            },
          });

          if (response.ok) {
            const data = await response.json();
            fetchedChains.push(chain);
            
            if (data.nfts && data.nfts.length > 0) {
              // Add chain info and calculate rarity score for each NFT
              const nftsWithChain = data.nfts
                .filter((nft: any) => {
                  // Exclude POAP v2 NFTs (Gnosis chain POAPs)
                  const isPoapV2 = nft.contract?.toLowerCase() === '0x22c1f6050e56d2876009903609a2cc3fef83b415' ||
                                  nft.collection?.toLowerCase().includes('poap');
                  return !isPoapV2;
                })
                .map((nft: any) => {
                  // Calculate rarity score based on traits if available
                  let rarityScore = 0;
                  let rarityRank = null;
                  
                  if (nft.metadata?.attributes && Array.isArray(nft.metadata.attributes)) {
                    const traitCount = nft.metadata.attributes.length;
                    rarityScore = Math.max(0, 100 - (traitCount * 5));
                    
                    const uniqueTraits = nft.metadata.attributes.filter((trait: any) => 
                      trait.rarity || trait.trait_count < 10
                    );
                    rarityScore += uniqueTraits.length * 10;
                  }
                  
                  return {
                    ...nft,
                    chain: chain,
                    rarity_score: rarityScore,
                    rarity_rank: rarityRank,
                    floor_price: nft.collection?.floor_price,
                    total_supply: nft.collection?.total_supply,
                    created_date: nft.created_at,
                  };
                });
              
              allNfts = [...allNfts, ...nftsWithChain];
              console.log(`✅ ${chain} page ${pageCount + 1}: fetched ${nftsWithChain.length} NFTs (total: ${allNfts.length})`);
            }
            
            // Check for more pages
            if (data.next) {
              chainCursor = data.next;
              pageCount++;
            } else {
              hasMore = false;
            }
            
            retryCount = 0; // Reset retry count on success
          } else if (response.status === 429 && retryCount < MAX_RETRIES) {
            // Rate limited - wait and retry
            retryCount++;
            console.log(`⚠️ ${chain}: Rate limited (429), retry ${retryCount}/${MAX_RETRIES}...`);
            await new Promise(r => setTimeout(r, 1000 * retryCount));
            continue; // Don't increment pageCount, retry same page
          } else {
            const errorMsg = `HTTP ${response.status}`;
            console.log(`⚠️ ${chain}: API returned ${response.status}`);
            errorsByChain[chain] = errorMsg;
            hasMore = false;
          }
        } catch (chainError: any) {
          const errorMsg = chainError.message || 'Unknown error';
          console.log(`⚠️ Error fetching from ${chain}:`, errorMsg);
          errorsByChain[chain] = errorMsg;
          hasMore = false;
        }
      }
      
      if (pageCount > 0) {
        console.log(`📊 ${chain}: completed with ${pageCount + 1} page(s)`);
      }
      
      // Small delay between chains to avoid rate limiting
      if (chains.indexOf(chain) < chains.length - 1) {
        await new Promise(r => setTimeout(r, INTER_CHAIN_DELAY));
      }
    }
    
    console.log(`✅ Total NFTs fetched across all chains: ${allNfts.length}`);
    if (Object.keys(errorsByChain).length > 0) {
      console.log(`⚠️ Errors by chain:`, errorsByChain);
    }

    // Deduplicate NFTs and track quantities
    const nftMap = new Map();
    allNfts.forEach((nft: any) => {
      const uniqueKey = `${nft.contract}-${nft.identifier}`;
      if (nftMap.has(uniqueKey)) {
        const existing = nftMap.get(uniqueKey);
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        nftMap.set(uniqueKey, { ...nft, quantity: 1 });
      }
    });

    const deduplicatedNfts = Array.from(nftMap.values());
    console.log(`🎯 Deduplicated to ${deduplicatedNfts.length} unique NFTs (from ${allNfts.length} total)`);

    return new Response(JSON.stringify({
      nfts: deduplicatedNfts,
      attempted: true,
      fetchedChains,
      errorsByChain: Object.keys(errorsByChain).length > 0 ? errorsByChain : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Error fetching OpenSea NFTs:', error);
    return new Response(JSON.stringify({ 
      nfts: [],
      attempted: true, 
      error: error.message,
      errorsByChain: { all: error.message }
    }), {
      status: 200, // Return 200 with error info instead of 400 to let frontend handle gracefully
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
