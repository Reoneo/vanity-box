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

    // Get and trim the API key to remove any whitespace/hidden chars
    const rawKey = Deno.env.get('ZERION_API_KEY') || '';
    const ZERION_API_KEY = rawKey.trim();
    
    if (!ZERION_API_KEY) {
      console.error('ZERION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Zerion API key not configured', tokens: [], totalValue: 0 }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Debug: Log API key info to diagnose auth issues
    console.log(`Zerion API key length: ${ZERION_API_KEY.length}, first 8 chars: ${ZERION_API_KEY.substring(0, 8)}...`);
    console.log(`Fetching portfolio for wallet: ${walletAddress}`);

    // Zerion API uses Basic auth: API_KEY as username, empty password
    // Build the credentials string and encode to base64
    const credentials = `${ZERION_API_KEY}:`;
    const base64Credentials = btoa(credentials);
    const authHeader = `Basic ${base64Credentials}`;

    console.log(`Auth header format: Basic ${base64Credentials.substring(0, 12)}...`);

    // Fetch positions (fungible tokens)
    const positionsUrl = `https://api.zerion.io/v1/wallets/${walletAddress}/positions/?filter[positions]=only_simple&currency=usd&sort=value`;
    console.log(`Fetching positions from: ${positionsUrl}`);
    
    const positionsResponse = await fetch(positionsUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log(`Zerion API response status: ${positionsResponse.status}`);

    if (!positionsResponse.ok) {
      const errorText = await positionsResponse.text();
      console.error(`Zerion positions error: ${positionsResponse.status} - ${errorText}`);
      
      // Enhanced 401 debugging
      if (positionsResponse.status === 401) {
        console.error('=== 401 Unauthorized Debug Info ===');
        console.error(`API key length: ${ZERION_API_KEY.length}`);
        console.error(`API key starts with: ${ZERION_API_KEY.substring(0, 10)}`);
        console.error(`API key ends with: ${ZERION_API_KEY.substring(ZERION_API_KEY.length - 4)}`);
        console.error('Possible causes: key not activated, expired, or wrong format');
      }
      
      return new Response(
        JSON.stringify({ 
          tokens: [], 
          totalValue: 0, 
          error: `Zerion API error: ${positionsResponse.status}`,
          details: errorText.slice(0, 200)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const positionsData = await positionsResponse.json();
    console.log(`Found ${positionsData.data?.length || 0} positions`);
    
    const tokens = (positionsData.data || []).map((position: any) => {
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
        chain: position.relationships?.chain?.data?.id || 'unknown',
        priceChange24h: attributes?.changes?.percent_1d || 0,
      };
    }).filter((token: any) => token.value > 0.01); // Filter out dust

    // Calculate total value
    const totalValue = tokens.reduce((sum: number, token: any) => sum + (token.value || 0), 0);

    console.log(`Successfully fetched ${tokens.length} tokens with total value: $${totalValue.toFixed(2)}`);

    return new Response(
      JSON.stringify({ 
        tokens,
        totalValue,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-wallet-portfolio:', error);
    return new Response(
      JSON.stringify({ error: error.message, tokens: [], totalValue: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});