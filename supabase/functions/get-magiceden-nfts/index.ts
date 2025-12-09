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

    // Magic Eden API endpoint for World Chain NFTs
    // World Chain uses chain identifier "worldchain" or chain ID 480
    const allNfts: any[] = [];
    let continuation: string | null = null;
    const MAX_PAGES = 5;
    let pageCount = 0;

    do {
      const url = new URL(`https://api-mainnet.magiceden.dev/v3/rtp/worldchain/users/${walletAddress}/tokens/v7`);
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
