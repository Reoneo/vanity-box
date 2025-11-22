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

    let url = `https://api.opensea.io/api/v2/chain/ethereum/account/${walletAddress}/nfts?limit=${limit}`;
    if (next) {
      url += `&next=${next}`;
    }
    
    console.log('📡 Fetching from OpenSea:', url);
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-api-key': OPENSEA_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenSea API error:', response.status, errorText);
      throw new Error(`Failed to fetch NFTs: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Fetched NFTs:', data.nfts?.length || 0);

    return new Response(JSON.stringify({
      nfts: data.nfts || [],
      next: data.next || null,
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
