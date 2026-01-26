import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Alchemy's NFT API to get Basenames (they appear as NFTs on Base)
// Basenames contract on Base: 0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a
const BASENAMES_CONTRACT = '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== 'string') {
      return new Response(JSON.stringify({ domains: [], count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    console.log('🔍 Fetching Basenames for:', normalizedAddress);

    // Use Alchemy NFT API to fetch Basenames NFTs owned by this address
    const alchemyKey = Deno.env.get('ALCHEMY_API_KEY');
    
    if (!alchemyKey) {
      console.error('❌ ALCHEMY_API_KEY not configured');
      return new Response(JSON.stringify({ domains: [], count: 0, error: 'API key not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query Alchemy for NFTs from the Basenames contract
    const alchemyUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${alchemyKey}/getNFTsForOwner`;
    const params = new URLSearchParams({
      owner: normalizedAddress,
      'contractAddresses[]': BASENAMES_CONTRACT,
      withMetadata: 'true',
      pageSize: '100',
    });

    console.log('📤 Querying Alchemy for Basenames NFTs...');
    
    const response = await fetch(`${alchemyUrl}?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Alchemy error:', response.status, errorText);
      throw new Error(`Alchemy error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Alchemy returned ${data.ownedNfts?.length || 0} Basenames`);

    const formattedDomains = (data.ownedNfts || []).map((nft: any) => {
      // Extract the name from metadata
      const name = nft.name || nft.raw?.metadata?.name || `Token #${nft.tokenId}`;
      const fullName = name.endsWith('.base.eth') ? name : `${name}.base.eth`;
      
      return {
        identifier: fullName,
        name: fullName,
        collection: 'Basenames',
        image_url: nft.image?.cachedUrl || nft.image?.originalUrl || `https://www.base.org/api/basenames/${fullName}/avatar`,
        display_image_url: nft.image?.cachedUrl || nft.image?.originalUrl || `https://www.base.org/api/basenames/${fullName}/avatar`,
        type: 'owned',
        tokenId: nft.tokenId,
        chain: 'base',
        isBasename: true,
      };
    });

    return new Response(JSON.stringify({
      domains: formattedDomains,
      count: formattedDomains.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error fetching Basenames:', error);
    return new Response(JSON.stringify({
      domains: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
