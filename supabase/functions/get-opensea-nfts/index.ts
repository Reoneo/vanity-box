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
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      console.error('No wallet address provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('OPENSEA_API_KEY');
    if (!apiKey) {
      console.error('OpenSea API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'OpenSea API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching NFTs for wallet: ${walletAddress}`);

    // OpenSea API v2 endpoint
    const response = await fetch(
      `https://api.opensea.io/api/v2/chain/ethereum/account/${walletAddress}/nfts?limit=50`,
      {
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenSea API error (${response.status}):`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `OpenSea API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.nfts?.length || 0} NFTs`);

    const nfts = data.nfts?.map((nft: any) => ({
      id: nft.identifier,
      name: nft.name || nft.contract?.name || 'Unnamed NFT',
      description: nft.description,
      image_url: nft.image_url || nft.display_image_url,
      collection: nft.collection,
      contract: nft.contract,
      permalink: `https://opensea.io/assets/ethereum/${nft.contract}/${nft.identifier}`,
    })) || [];

    return new Response(
      JSON.stringify({
        success: true,
        nfts,
        count: nfts.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-opensea-nfts function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
