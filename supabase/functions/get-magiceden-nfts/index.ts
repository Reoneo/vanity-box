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
    const { walletAddress, limit = 50 } = await req.json();

    if (!walletAddress) {
      console.error('Missing wallet address');
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAGIC_EDEN_API_KEY = Deno.env.get('MAGIC_EDEN_API_KEY');
    console.log(`Fetching EVM NFTs from Magic Eden for wallet: ${walletAddress}`);
    console.log(`API Key configured: ${!!MAGIC_EDEN_API_KEY}`);

    const allNfts: any[] = [];

    // Magic Eden EVM API v3 - supported chains
    const EVM_CHAINS = [
      'ethereum',
      'polygon', 
      'base',
      'arbitrum',
      'optimism',
      'bsc',
      'avalanche'
    ];
    
    for (const chainId of EVM_CHAINS) {
      try {
        // Magic Eden EVM API v3 endpoint for user tokens
        // Docs: https://docs.magiceden.io/reference/get_v3-rtp-chain-users-user-tokens-v7
        const url = `https://api-mainnet.magiceden.dev/v3/rtp/${chainId}/users/${walletAddress}/tokens/v7?limit=${Math.min(limit, 100)}&includeAttributes=true&includeLastSale=true`;
        console.log(`[${chainId}] Fetching: ${url}`);

        const headers: Record<string, string> = {
          'Accept': 'application/json',
        };
        
        // Add authorization if API key exists
        if (MAGIC_EDEN_API_KEY) {
          headers['Authorization'] = `Bearer ${MAGIC_EDEN_API_KEY}`;
        }

        const response = await fetch(url, { headers });

        if (response.ok) {
          const data = await response.json();
          const tokens = data.tokens || [];
          console.log(`[${chainId}] Found ${tokens.length} NFTs`);

          tokens.forEach((item: any) => {
            const token = item.token || item;
            allNfts.push({
              identifier: token.tokenId || item.tokenId,
              collection: token.collection?.name || item.collection?.name || `${chainId.charAt(0).toUpperCase() + chainId.slice(1)} NFT`,
              contract: token.contract || item.contract,
              token_standard: token.kind || 'erc721',
              name: token.name || `#${token.tokenId || item.tokenId}`,
              description: token.description,
              image_url: token.image || token.imageLarge || token.imageSmall,
              display_image_url: token.image || token.imageLarge || token.imageSmall,
              animation_url: token.media,
              metadata_url: token.tokenUri,
              chain: chainId,
              rarity_score: token.rarityRank || 0,
              rarity_rank: token.rarityRank,
              floor_price: token.collection?.floorAskPrice?.amount?.decimal,
              quantity: item.ownership?.tokenCount || 1,
              lastSale: item.ownership?.acquiredAt ? {
                price: token.lastSale?.price?.amount?.decimal,
                currency: token.lastSale?.price?.currency?.symbol,
              } : null,
            });
          });
        } else {
          const errorText = await response.text();
          console.log(`[${chainId}] API error ${response.status}: ${errorText.slice(0, 200)}`);
        }

        // Delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (chainError) {
        console.error(`[${chainId}] Error:`, chainError.message);
      }
    }

    console.log(`Total Magic Eden EVM NFTs fetched: ${allNfts.length}`);

    return new Response(
      JSON.stringify({ 
        nfts: allNfts, 
        total: allNfts.length,
      }),
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
