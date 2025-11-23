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
    let body;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Failed to parse request body:', e);
      body = {};
    }
    
    const { walletAddress, limit = 20, next } = body;
    
    if (!walletAddress) {
      throw new Error('walletAddress is required');
    }
    
    console.log('🖼️ Fetching OpenSea NFTs for:', walletAddress);
    
    const OPENSEA_API_KEY = Deno.env.get('OPENSEA_API_KEY');
    
    if (!OPENSEA_API_KEY) {
      console.error('❌ OPENSEA_API_KEY not configured');
      throw new Error('OPENSEA_API_KEY not configured');
    }

    // OpenSea supported chains
    const chains = [
      'ethereum',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
      'avalanche',
      'bsc',
      'klaytn',
      'solana',
      'zora'
    ];

    let allNfts: any[] = [];
    let nextCursor = null;

    // Fetch NFTs from all supported chains
    for (const chain of chains) {
      try {
        let url = `https://api.opensea.io/api/v2/chain/${chain}/account/${walletAddress}/nfts?limit=${limit}`;
        if (next && chain === 'ethereum') {
          // Only use cursor for initial chain to maintain pagination
          url += `&next=${next}`;
        }
        
        console.log(`📡 Fetching from OpenSea (${chain}):`, url);
        
        const response = await fetch(url, {
          headers: {
            'accept': 'application/json',
            'x-api-key': OPENSEA_API_KEY,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.nfts && data.nfts.length > 0) {
            // Add chain info to each NFT
            const nftsWithChain = data.nfts.map((nft: any) => ({
              ...nft,
              chain: chain
            }));
            allNfts = [...allNfts, ...nftsWithChain];
            console.log(`✅ Fetched ${data.nfts.length} NFTs from ${chain}`);
          }
          
          // Save cursor from ethereum for pagination
          if (chain === 'ethereum' && data.next) {
            nextCursor = data.next;
          }
        } else {
          console.log(`⚠️ No NFTs found on ${chain} or API error`);
        }
      } catch (chainError) {
        console.log(`⚠️ Error fetching from ${chain}:`, chainError.message);
        // Continue with next chain
      }
    }
    
    console.log(`✅ Total NFTs fetched across all chains: ${allNfts.length}`);

    return new Response(JSON.stringify({
      nfts: allNfts,
      next: nextCursor,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error fetching OpenSea NFTs:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
