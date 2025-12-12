import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All supported Magic Eden EVM chains
const SUPPORTED_CHAINS = [
  'ethereum',
  'polygon', 
  'base',
  'arbitrum',
  'bsc',
  'avalanche',
  'apechain',
  'sei',
  'monad',
  'berachain',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, limit = 100 } = await req.json();

    if (!walletAddress) {
      console.error('Missing wallet address');
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAGIC_EDEN_API_KEY = Deno.env.get('MAGIC_EDEN_API_KEY');
    if (!MAGIC_EDEN_API_KEY) {
      console.error('MAGIC_EDEN_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Magic Eden API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching NFTs from Magic Eden for wallet: ${walletAddress}`);

    const allNfts: any[] = [];
    const MAX_PAGES_PER_CHAIN = 5;
    const chainResults: { [key: string]: number } = {};

    // Fetch NFTs from all supported chains in parallel
    const chainPromises = SUPPORTED_CHAINS.map(async (chainId) => {
      const chainNfts: any[] = [];
      let continuation: string | null = null;
      let pageCount = 0;

      try {
        do {
          const url = new URL(`https://api-mainnet.magiceden.dev/v3/rtp/${chainId}/users/${walletAddress}/tokens/v7`);
          url.searchParams.set('limit', String(Math.min(limit, 100)));
          url.searchParams.set('includeAttributes', 'true');
          url.searchParams.set('includeLastSale', 'true');
          
          if (continuation) {
            url.searchParams.set('continuation', continuation);
          }

          console.log(`[${chainId}] Fetching page ${pageCount + 1}: ${url.toString()}`);

          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': `Bearer ${MAGIC_EDEN_API_KEY}`,
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`[${chainId}] API error ${response.status}: ${errorText.substring(0, 200)}`);
            break;
          }

          const data = await response.json();
          const tokens = data.tokens || [];
          
          console.log(`[${chainId}] Page ${pageCount + 1}: Found ${tokens.length} NFTs`);

          if (tokens.length > 0) {
            const transformedNfts = tokens.map((item: any) => {
              const token = item.token || item;
              return {
                identifier: token.tokenId || item.tokenId,
                collection: token.collection?.name || item.collection?.name || `${chainId.charAt(0).toUpperCase() + chainId.slice(1)} Collection`,
                contract: token.contract || item.contract,
                token_standard: token.kind || 'erc721',
                name: token.name || `#${token.tokenId || item.tokenId}`,
                description: token.description,
                image_url: token.image || token.imageLarge || token.imageSmall,
                display_image_url: token.image || token.imageLarge || token.imageSmall,
                animation_url: token.media,
                metadata_url: token.tokenUri,
                opensea_url: null,
                chain: chainId,
                rarity_score: token.rarityRank || 0,
                rarity_rank: token.rarityRank,
                floor_price: token.collection?.floorAskPrice?.amount?.decimal,
                quantity: item.ownership?.tokenCount || 1,
              };
            });

            chainNfts.push(...transformedNfts);
          }

          continuation = data.continuation || null;
          pageCount++;
        } while (continuation && pageCount < MAX_PAGES_PER_CHAIN);

        chainResults[chainId] = chainNfts.length;
        return chainNfts;
      } catch (err) {
        console.error(`[${chainId}] Chain error:`, err.message);
        chainResults[chainId] = 0;
        return [];
      }
    });

    // Wait for all chain requests to complete
    const results = await Promise.all(chainPromises);
    
    // Flatten results
    for (const chainNfts of results) {
      allNfts.push(...chainNfts);
    }

    console.log('Chain results:', JSON.stringify(chainResults));
    console.log(`Total Magic Eden NFTs fetched: ${allNfts.length}`);

    return new Response(
      JSON.stringify({ 
        nfts: allNfts, 
        total: allNfts.length,
        chainResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-magiceden-nfts:', error);
    return new Response(
      JSON.stringify({ error: error.message, nfts: [], chainResults: {} }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
