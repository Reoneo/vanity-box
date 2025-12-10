import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only Ethereum and Polygon are officially supported by Magic Eden EVM API
const SUPPORTED_CHAINS = ['ethereum', 'polygon'];

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

    console.log(`Fetching NFTs from Magic Eden for wallet: ${walletAddress}`);

    const allNfts: any[] = [];
    const MAX_PAGES_PER_CHAIN = 3;

    // Try different API versions
    const API_VERSIONS = ['v6', 'v7'];

    // Fetch NFTs from supported chains (ethereum, polygon)
    for (const chainId of SUPPORTED_CHAINS) {
      let continuation: string | null = null;
      let pageCount = 0;
      let success = false;

      console.log(`Fetching from chain: ${chainId}`);

      // Try v6 endpoint first, then v7
      for (const version of API_VERSIONS) {
        if (success) break;
        
        try {
          const url = new URL(`https://api-mainnet.magiceden.dev/v3/rtp/${chainId}/users/${walletAddress}/tokens/${version}`);
          url.searchParams.set('limit', String(Math.min(limit, 100)));

          console.log(`Trying ${version}: ${url.toString()}`);

          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': `Bearer ${MAGIC_EDEN_API_KEY}`,
              'Accept': 'application/json',
            },
          });

          console.log(`Chain ${chainId} ${version} returned status ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`Chain ${chainId} ${version} error: ${errorText}`);
            continue;
          }

          success = true;
          const data = await response.json();
          console.log(`Chain ${chainId} ${version} returned ${data.tokens?.length || 0} NFTs`);

          if (data.tokens && data.tokens.length > 0) {
            const transformedNfts = data.tokens.map((token: any) => ({
              identifier: token.token?.tokenId || token.tokenId,
              collection: token.token?.collection?.name || token.collection?.name || `${chainId.charAt(0).toUpperCase() + chainId.slice(1)} Collection`,
              contract: token.token?.contract || token.contract,
              token_standard: token.token?.kind || 'erc721',
              name: token.token?.name || `#${token.token?.tokenId || token.tokenId}`,
              description: token.token?.description,
              image_url: token.token?.image || token.token?.imageLarge || token.token?.imageSmall,
              display_image_url: token.token?.image || token.token?.imageLarge || token.token?.imageSmall,
              animation_url: token.token?.media,
              metadata_url: token.token?.tokenUri,
              opensea_url: null,
              chain: chainId,
              rarity_score: token.token?.rarityRank || 0,
              rarity_rank: token.token?.rarityRank,
              floor_price: token.token?.collection?.floorAskPrice?.amount?.decimal,
              quantity: token.ownership?.tokenCount || 1,
            }));

            allNfts.push(...transformedNfts);
          }

          // Handle pagination
          continuation = data.continuation || null;
          while (continuation && pageCount < MAX_PAGES_PER_CHAIN) {
            pageCount++;
            const pageUrl = new URL(`https://api-mainnet.magiceden.dev/v3/rtp/${chainId}/users/${walletAddress}/tokens/${version}`);
            pageUrl.searchParams.set('limit', String(Math.min(limit, 100)));
            pageUrl.searchParams.set('continuation', continuation);

            const pageResponse = await fetch(pageUrl.toString(), {
              headers: {
                'Authorization': `Bearer ${MAGIC_EDEN_API_KEY}`,
                'Accept': 'application/json',
              },
            });

            if (!pageResponse.ok) break;

            const pageData = await pageResponse.json();
            if (pageData.tokens && pageData.tokens.length > 0) {
              const transformedNfts = pageData.tokens.map((token: any) => ({
                identifier: token.token?.tokenId || token.tokenId,
                collection: token.token?.collection?.name || token.collection?.name || `${chainId.charAt(0).toUpperCase() + chainId.slice(1)} Collection`,
                contract: token.token?.contract || token.contract,
                token_standard: token.token?.kind || 'erc721',
                name: token.token?.name || `#${token.token?.tokenId || token.tokenId}`,
                description: token.token?.description,
                image_url: token.token?.image || token.token?.imageLarge || token.token?.imageSmall,
                display_image_url: token.token?.image || token.token?.imageLarge || token.token?.imageSmall,
                animation_url: token.token?.media,
                metadata_url: token.token?.tokenUri,
                opensea_url: null,
                chain: chainId,
                rarity_score: token.token?.rarityRank || 0,
                rarity_rank: token.token?.rarityRank,
                floor_price: token.token?.collection?.floorAskPrice?.amount?.decimal,
                quantity: token.ownership?.tokenCount || 1,
              }));

              allNfts.push(...transformedNfts);
            }
            continuation = pageData.continuation || null;
          }
        } catch (err) {
          console.log(`Chain ${chainId} ${version} failed: ${err.message}`);
        }
      }
    }

    console.log(`Total Magic Eden NFTs fetched: ${allNfts.length}`);

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
