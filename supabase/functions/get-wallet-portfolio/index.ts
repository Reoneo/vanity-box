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
      return new Response(
        JSON.stringify({ error: 'walletAddress is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ZERION_API_KEY = Deno.env.get('ZERION_API_KEY');
    if (!ZERION_API_KEY) {
      console.error('ZERION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Zerion API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching portfolio for wallet: ${walletAddress}`);

    // Fetch portfolio from Zerion
    const portfolioUrl = `https://api.zerion.io/v1/wallets/${walletAddress}/portfolio?currency=usd`;
    console.log(`Calling: ${portfolioUrl}`);
    
    const portfolioResponse = await fetch(portfolioUrl, {
      headers: {
        'Authorization': `Basic ${btoa(ZERION_API_KEY + ':')}`,
        'Accept': 'application/json',
      },
    });

    if (!portfolioResponse.ok) {
      const errorText = await portfolioResponse.text();
      console.error(`Zerion portfolio error: ${portfolioResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch portfolio', details: errorText }),
        { status: portfolioResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const portfolioData = await portfolioResponse.json();
    console.log('Portfolio response:', JSON.stringify(portfolioData).slice(0, 500));

    // Also fetch positions (tokens)
    const positionsUrl = `https://api.zerion.io/v1/wallets/${walletAddress}/positions?filter[positions]=only_simple&currency=usd&sort=value`;
    console.log(`Fetching positions: ${positionsUrl}`);
    
    const positionsResponse = await fetch(positionsUrl, {
      headers: {
        'Authorization': `Basic ${btoa(ZERION_API_KEY + ':')}`,
        'Accept': 'application/json',
      },
    });

    let tokens: any[] = [];
    if (positionsResponse.ok) {
      const positionsData = await positionsResponse.json();
      console.log(`Found ${positionsData.data?.length || 0} positions`);
      
      tokens = (positionsData.data || []).map((position: any) => {
        const attributes = position.attributes;
        const fungibleInfo = attributes?.fungible_info;
        
        return {
          id: position.id,
          name: fungibleInfo?.name || 'Unknown Token',
          symbol: fungibleInfo?.symbol || '???',
          icon: fungibleInfo?.icon?.url || null,
          quantity: attributes?.quantity?.float || 0,
          value: attributes?.value || 0,
          price: attributes?.price || 0,
          chain: attributes?.position_type === 'wallet' ? (position.relationships?.chain?.data?.id || 'unknown') : null,
          priceChange24h: attributes?.changes?.percent_1d || 0,
        };
      }).filter((token: any) => token.value > 0.01); // Filter out dust
    }

    const result = {
      portfolio: portfolioData.data?.attributes || {},
      tokens,
      totalValue: portfolioData.data?.attributes?.total?.positions || 0,
    };

    console.log(`Successfully fetched portfolio with ${tokens.length} tokens`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-wallet-portfolio:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
