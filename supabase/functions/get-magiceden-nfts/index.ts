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

    // For Bitcoin Ordinals - use the ordinals endpoint
    // Check if wallet is a Bitcoin address (starts with bc1 or similar)
    const isBitcoinWallet = walletAddress.startsWith('bc1') || 
                            walletAddress.startsWith('1') || 
                            walletAddress.startsWith('3');

    if (isBitcoinWallet) {
      // Bitcoin Ordinals endpoint
      try {
        const btcUrl = `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?ownerAddress=${walletAddress}&limit=${Math.min(limit, 100)}`;
        console.log(`Fetching Bitcoin Ordinals: ${btcUrl}`);

        const btcResponse = await fetch(btcUrl, {
          headers: {
            'Authorization': `Bearer ${MAGIC_EDEN_API_KEY}`,
            'Accept': 'application/json',
          },
        });

        if (btcResponse.ok) {
          const btcData = await btcResponse.json();
          const tokens = btcData.tokens || btcData || [];
          console.log(`Found ${tokens.length} Bitcoin Ordinals`);

          tokens.forEach((token: any) => {
            allNfts.push({
              identifier: token.id || token.inscriptionId,
              collection: token.collection?.name || token.collectionSymbol || 'Bitcoin Ordinals',
              contract: null,
              token_standard: 'ordinals',
              name: token.meta?.name || token.name || `Ordinal #${token.inscriptionNumber || token.id}`,
              description: token.meta?.description,
              image_url: token.contentURI || token.meta?.image || token.content?.url,
              display_image_url: token.contentPreviewURI || token.contentURI || token.meta?.image,
              animation_url: token.content?.animationUrl,
              metadata_url: null,
              chain: 'bitcoin',
              rarity_score: token.rarity?.score || 0,
              rarity_rank: token.rarity?.rank,
              floor_price: token.floorPrice,
              quantity: 1,
              inscriptionNumber: token.inscriptionNumber,
            });
          });
        } else {
          const errorText = await btcResponse.text();
          console.log(`Bitcoin Ordinals fetch failed: ${btcResponse.status} - ${errorText.slice(0, 200)}`);
        }
      } catch (btcError) {
        console.error('Bitcoin Ordinals error:', btcError.message);
      }
    } else {
      // EVM chains - fetch sequentially with delay to avoid rate limits
      const EVM_CHAINS = ['ethereum', 'polygon', 'base', 'arbitrum'];
      
      for (const chainId of EVM_CHAINS) {
        try {
          const url = `https://api-mainnet.magiceden.dev/v3/rtp/${chainId}/users/${walletAddress}/tokens/v7?limit=${Math.min(limit, 100)}&includeAttributes=true`;
          console.log(`[${chainId}] Fetching: ${url}`);

          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${MAGIC_EDEN_API_KEY}`,
              'Accept': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            const tokens = data.tokens || [];
            console.log(`[${chainId}] Found ${tokens.length} NFTs`);

            tokens.forEach((item: any) => {
              const token = item.token || item;
              allNfts.push({
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
                chain: chainId,
                rarity_score: token.rarityRank || 0,
                rarity_rank: token.rarityRank,
                floor_price: token.collection?.floorAskPrice?.amount?.decimal,
                quantity: item.ownership?.tokenCount || 1,
              });
            });
          } else {
            const errorText = await response.text();
            console.log(`[${chainId}] API error ${response.status}: ${errorText.slice(0, 200)}`);
          }

          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (chainError) {
          console.error(`[${chainId}] Error:`, chainError.message);
        }
      }
    }

    console.log(`Total Magic Eden NFTs fetched: ${allNfts.length}`);

    return new Response(
      JSON.stringify({ 
        nfts: allNfts, 
        total: allNfts.length,
        walletType: isBitcoinWallet ? 'bitcoin' : 'evm',
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