import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    console.log(`Fetching World Chain NFTs for wallet: ${walletAddress}`);

    // Note: Magic Eden EVM API currently only supports ethereum and polygon chains
    // World Chain (chain ID 480) is not yet supported by Magic Eden
    // We'll attempt to fetch but expect it may not work until Magic Eden adds World Chain support
    
    const allNfts: any[] = [];
    let continuation: string | null = null;
    const MAX_PAGES = 5;
    let pageCount = 0;

    // Try different possible chain identifiers for World Chain
    const possibleChainIds = ['world-chain', 'worldchain', '480'];
    let successfulChain: string | null = null;

    for (const chainId of possibleChainIds) {
      try {
        const url = new URL(`https://api-mainnet.magiceden.dev/v3/rtp/${chainId}/users/${walletAddress}/tokens/v7`);
        url.searchParams.set('limit', '1'); // Test with 1 item first

        console.log(`Testing Magic Eden chain: ${chainId}`);

        const testResponse = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${MAGIC_EDEN_API_KEY}`,
            'Accept': 'application/json',
          },
        });

        if (testResponse.ok) {
          successfulChain = chainId;
          console.log(`Found working chain identifier: ${chainId}`);
          break;
        } else {
          console.log(`Chain ${chainId} returned status ${testResponse.status}`);
        }
      } catch (err) {
        console.log(`Chain ${chainId} failed: ${err.message}`);
      }
    }

    if (!successfulChain) {
      console.log('World Chain is not yet supported by Magic Eden EVM API');
      console.log('Magic Eden currently only supports: ethereum, polygon');
      
      // Return empty array gracefully - World Chain NFTs not yet available via Magic Eden
      return new Response(
        JSON.stringify({ 
          nfts: [], 
          total: 0, 
          message: 'World Chain NFTs are not yet available. Magic Eden EVM API currently supports Ethereum and Polygon only.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we found a working chain, fetch NFTs
    do {
      const url = new URL(`https://api-mainnet.magiceden.dev/v3/rtp/${successfulChain}/users/${walletAddress}/tokens/v7`);
      url.searchParams.set('limit', String(Math.min(limit, 100)));
      if (continuation) {
        url.searchParams.set('continuation', continuation);
      }

      console.log(`Fetching page ${pageCount + 1} from Magic Eden: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${MAGIC_EDEN_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Magic Eden API error: ${response.status} - ${errorText}`);
        
        // If 404 or no NFTs, return empty array
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ nfts: [], total: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Magic Eden API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Page ${pageCount + 1} returned ${data.tokens?.length || 0} NFTs`);

      if (data.tokens && data.tokens.length > 0) {
        // Transform Magic Eden response to match our NFT structure
        const transformedNfts = data.tokens.map((token: any) => ({
          identifier: token.token?.tokenId || token.tokenId,
          collection: token.token?.collection?.name || token.collection?.name || 'World Chain Collection',
          contract: token.token?.contract || token.contract,
          token_standard: token.token?.kind || 'erc721',
          name: token.token?.name || `#${token.token?.tokenId || token.tokenId}`,
          description: token.token?.description,
          image_url: token.token?.image || token.token?.imageLarge || token.token?.imageSmall,
          display_image_url: token.token?.image || token.token?.imageLarge || token.token?.imageSmall,
          animation_url: token.token?.media,
          metadata_url: token.token?.tokenUri,
          opensea_url: null,
          chain: 'worldchain',
          rarity_score: token.token?.rarityRank || 0,
          rarity_rank: token.token?.rarityRank,
          floor_price: token.token?.collection?.floorAskPrice?.amount?.decimal,
          quantity: token.ownership?.tokenCount || 1,
        }));

        allNfts.push(...transformedNfts);
      }

      continuation = data.continuation || null;
      pageCount++;
    } while (continuation && pageCount < MAX_PAGES && allNfts.length < limit);

    console.log(`Total World Chain NFTs fetched: ${allNfts.length}`);

    return new Response(
      JSON.stringify({ nfts: allNfts, total: allNfts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-magiceden-nfts:', error);
    return new Response(
      JSON.stringify({ error: error.message, nfts: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
