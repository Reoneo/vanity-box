import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HLN REST API base URL
const HLN_API_BASE = 'https://hlnames-rest-api.onrender.com/api';

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

    console.log(`Fetching HLN data for wallet: ${walletAddress}`);

    // Try multiple endpoints to find NFTs and tokens
    let nfts: any[] = [];
    let tokens: any[] = [];

    // Endpoint 1: Try wallet assets endpoint
    try {
      const assetsUrl = `${HLN_API_BASE}/wallet/assets/${walletAddress}`;
      console.log(`Fetching assets: ${assetsUrl}`);
      
      const assetsResponse = await fetch(assetsUrl, {
        headers: {
          'x-api-key': HLN_API_KEY,
          'Accept': 'application/json',
        },
      });

      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json();
        console.log('Assets response:', JSON.stringify(assetsData).slice(0, 500));
        
        if (assetsData.nfts) {
          nfts = assetsData.nfts.map((nft: any) => ({
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
        }
        
        if (assetsData.tokens) {
          tokens = assetsData.tokens.map((token: any) => ({
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
        }
      } else {
        console.log(`Assets fetch failed: ${assetsResponse.status}`);
      }
    } catch (assetsError) {
      console.log('Assets fetch error:', assetsError.message);
    }

    // Endpoint 2: Try user/portfolio endpoint
    if (nfts.length === 0 && tokens.length === 0) {
      try {
        const portfolioUrl = `${HLN_API_BASE}/user/portfolio/${walletAddress}`;
        console.log(`Fetching portfolio: ${portfolioUrl}`);
        
        const portfolioResponse = await fetch(portfolioUrl, {
          headers: {
            'x-api-key': HLN_API_KEY,
            'Accept': 'application/json',
          },
        });

        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json();
          console.log('Portfolio response:', JSON.stringify(portfolioData).slice(0, 500));
          
          const rawNfts = portfolioData.nfts || portfolioData.collectibles || [];
          const rawTokens = portfolioData.tokens || portfolioData.balances || [];
          
          nfts = (Array.isArray(rawNfts) ? rawNfts : []).map((nft: any) => ({
            identifier: nft.tokenId || nft.id,
            collection: nft.collection?.name || nft.collectionName || 'Hyperliquid Collection',
            contract: nft.contract,
            token_standard: 'erc721',
            name: nft.name || `#${nft.tokenId || nft.id}`,
            description: nft.description,
            image_url: nft.image || nft.imageUrl,
            display_image_url: nft.image || nft.imageUrl,
            chain: 'hyperliquid',
            quantity: 1,
          }));
          
          tokens = (Array.isArray(rawTokens) ? rawTokens : []).map((token: any) => ({
            symbol: token.symbol,
            name: token.name || token.symbol,
            balance: token.balance,
            decimals: token.decimals || 18,
            contract: token.contract,
            logo: token.logo || token.image,
            price: token.price,
            value: token.value,
            chain: 'hyperliquid',
          }));
        } else {
          console.log(`Portfolio fetch failed: ${portfolioResponse.status}`);
        }
      } catch (portfolioError) {
        console.log('Portfolio fetch error:', portfolioError.message);
      }
    }

    // Endpoint 3: Try the names owned by wallet as NFTs (HLN names are NFTs)
    if (nfts.length === 0) {
      try {
        const namesUrl = `${HLN_API_BASE}/utils/names_owner/${walletAddress}`;
        console.log(`Fetching owned names as NFTs: ${namesUrl}`);
        
        const namesResponse = await fetch(namesUrl, {
          headers: {
            'x-api-key': HLN_API_KEY,
            'Accept': 'application/json',
          },
        });

        if (namesResponse.ok) {
          const namesData = await namesResponse.json();
          console.log('Names response:', JSON.stringify(namesData));
          
          const ownedNames = namesData.names || namesData || [];
          if (Array.isArray(ownedNames) && ownedNames.length > 0) {
            nfts = ownedNames.map((entry: any, index: number) => {
              // Entry can be a string OR an object like { name, image, tokenId, ... }
              const nameStr = typeof entry === 'string'
                ? entry
                : (entry?.name || entry?.domain || entry?.handle || entry?.label || `HLN #${index}`);
              const safeName = String(nameStr);
              const img = typeof entry === 'object' && entry
                ? (entry.image || entry.image_url || entry.imageUrl || entry.avatar || null)
                : null;
              const tokenId = typeof entry === 'object' && entry
                ? (entry.tokenId || entry.id || entry.token_id || `hln-${index}`)
                : `hln-${index}`;
              return {
                identifier: String(tokenId),
                collection: 'HLN Names',
                contract: null,
                token_standard: 'erc721',
                name: safeName,
                description: `Hyperliquid Name: ${safeName}`,
                image_url: img,
                display_image_url: img,
                chain: 'hyperliquid',
                quantity: 1,
              };
            });
          }
        }
      } catch (namesError) {
        console.log('Names fetch error:', namesError.message);
      }
    }

    console.log(`Found ${nfts.length} NFTs and ${tokens.length} tokens`);

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