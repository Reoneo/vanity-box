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
    
    const { walletAddress: rawWalletAddress, limit = 20, next: rawNext } = body;
    
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
    
    // Sanitize next cursor
    const next = 
      rawNext && 
      typeof rawNext === 'object' && 
      (rawNext as any)?._type === 'undefined'
        ? undefined
        : typeof rawNext === 'string' && 
          rawNext !== 'undefined' && 
          rawNext.trim() !== ''
        ? rawNext
        : undefined;
    
    if (!walletAddress) {
      throw new Error('walletAddress is required');
    }
    
    console.log('🖼️ Fetching OpenSea NFTs for:', walletAddress);
    
    const OPENSEA_API_KEY = Deno.env.get('OPENSEA_API_KEY');
    
    if (!OPENSEA_API_KEY) {
      console.error('❌ OPENSEA_API_KEY not configured');
      throw new Error('OPENSEA_API_KEY not configured');
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
      'solana',
      'zora'
    ];

    let allNfts: any[] = [];
    let nextCursor = null;

    // Fetch NFTs from all supported chains
    for (const chain of chains) {
      try {
        let url = `https://api.opensea.io/api/v2/chain/${chain}/account/${walletAddress}/nfts?limit=${limit}`;
        if (next && chain === 'ethereum') {
          // Only use cursor for initial chain to maintain pagination
          url += `&next=${next}`;
        }
        
        console.log(`📡 Fetching from OpenSea (${chain}):`, url);
        
        const response = await fetch(url, {
          headers: {
            'accept': 'application/json',
            'x-api-key': OPENSEA_API_KEY,
          },
        });

        if (response.ok) {
          const data = await response.json();
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
                  // Simple rarity calculation: fewer traits = rarer
                  const traitCount = nft.metadata.attributes.length;
                  rarityScore = Math.max(0, 100 - (traitCount * 5));
                  
                  // Check for unique traits
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
            console.log(`✅ Fetched ${nftsWithChain.length} NFTs from ${chain} (after POAP filtering)`);
          }
          
          // Save cursor from ethereum for pagination
          if (chain === 'ethereum' && data.next) {
            nextCursor = data.next;
          }
        } else {
          console.log(`⚠️ No NFTs found on ${chain} or API error`);
        }
      } catch (chainError) {
        console.log(`⚠️ Error fetching from ${chain}:`, chainError.message);
        // Continue with next chain
      }
    }
    
    console.log(`✅ Total NFTs fetched across all chains: ${allNfts.length}`);

    // Deduplicate NFTs and track quantities
    const nftMap = new Map();
    allNfts.forEach((nft: any) => {
      const uniqueKey = `${nft.contract}-${nft.identifier}`;
      if (nftMap.has(uniqueKey)) {
        // Increment quantity if we've seen this NFT before
        const existing = nftMap.get(uniqueKey);
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        // First time seeing this NFT - initialize with quantity 1
        nftMap.set(uniqueKey, { ...nft, quantity: 1 });
      }
    });

    const deduplicatedNfts = Array.from(nftMap.values());
    console.log(`🎯 Deduplicated to ${deduplicatedNfts.length} unique NFTs (from ${allNfts.length} total)`);

    return new Response(JSON.stringify({
      nfts: deduplicatedNfts,
      next: nextCursor,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error fetching OpenSea NFTs:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
