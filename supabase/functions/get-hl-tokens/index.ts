import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HLN_API_BASE = 'https://api.hlnames.xyz/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HLN_API_KEY = Deno.env.get('HLN_API_KEY');
    if (!HLN_API_KEY) {
      console.error('HLN_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'HLN API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching HLN tokens for wallet: ${walletAddress}`);

    // Fetch NFTs
    let nfts: any[] = [];
    try {
      const nftsUrl = `${HLN_API_BASE}/nfts/${walletAddress}`;
      console.log(`Fetching NFTs: ${nftsUrl}`);
      
      const nftsResponse = await fetch(nftsUrl, {
        headers: {
          'Authorization': `Bearer ${HLN_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (nftsResponse.ok) {
        const nftsData = await nftsResponse.json();
        const rawNfts = nftsData.nfts || nftsData.items || nftsData || [];
        
        // Transform NFTs to match OpenSea format
        nfts = (Array.isArray(rawNfts) ? rawNfts : []).map((nft: any) => ({
          identifier: nft.tokenId || nft.id || nft.identifier,
          collection: nft.collection?.name || nft.collectionName || 'Hyperliquid Collection',
          contract: nft.contract || nft.contractAddress,
          token_standard: nft.tokenStandard || 'erc721',
          name: nft.name || nft.title || `#${nft.tokenId || nft.id}`,
          description: nft.description,
          image_url: nft.image || nft.imageUrl || nft.image_url,
          display_image_url: nft.image || nft.imageUrl || nft.image_url,
          animation_url: nft.animation_url || nft.animationUrl,
          metadata_url: nft.tokenUri || nft.metadata_url,
          chain: 'hyperliquid',
          rarity_score: nft.rarityScore || 0,
          rarity_rank: nft.rarityRank,
          floor_price: nft.floorPrice,
          quantity: nft.quantity || 1,
        }));
        
        console.log(`Found ${nfts.length} NFTs`);
      } else {
        console.log(`NFT fetch failed: ${nftsResponse.status}`);
      }
    } catch (nftError) {
      console.log('NFT fetch error:', nftError.message);
    }

    // Fetch tokens (fungible)
    let tokens: any[] = [];
    try {
      const tokensUrl = `${HLN_API_BASE}/tokens/${walletAddress}`;
      console.log(`Fetching tokens: ${tokensUrl}`);
      
      const tokensResponse = await fetch(tokensUrl, {
        headers: {
          'Authorization': `Bearer ${HLN_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json();
        const rawTokens = tokensData.tokens || tokensData.items || tokensData || [];
        
        tokens = (Array.isArray(rawTokens) ? rawTokens : []).map((token: any) => ({
          symbol: token.symbol || token.ticker,
          name: token.name || token.symbol,
          balance: token.balance || token.amount,
          decimals: token.decimals || 18,
          contract: token.contract || token.contractAddress,
          logo: token.logo || token.image || token.logoUrl,
          price: token.price || token.usdPrice,
          value: token.value || token.usdValue,
          chain: 'hyperliquid',
        }));
        
        console.log(`Found ${tokens.length} tokens`);
      } else {
        console.log(`Token fetch failed: ${tokensResponse.status}`);
      }
    } catch (tokenError) {
      console.log('Token fetch error:', tokenError.message);
    }

    return new Response(
      JSON.stringify({ 
        nfts,
        tokens,
        totalNfts: nfts.length,
        totalTokens: tokens.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-hl-tokens:', error);
    return new Response(
      JSON.stringify({ error: error.message, nfts: [], tokens: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
