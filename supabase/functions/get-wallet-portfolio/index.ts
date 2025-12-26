import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
        JSON.stringify({ error: 'walletAddress is required', tokens: [], totalValue: 0 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate EVM address format
    if (!/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      console.log(`Invalid EVM address format: ${walletAddress}`);
      return new Response(
        JSON.stringify({ error: 'Invalid EVM address format', tokens: [], totalValue: 0 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and clean the API key - remove whitespace and any hidden chars
    const rawKey = Deno.env.get('ZERION_API_KEY') || '';
    const ZERION_API_KEY = rawKey.trim().replace(/[\r\n\t]/g, '');
    
    if (!ZERION_API_KEY) {
      console.error('ZERION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Zerion API key not configured', tokens: [], totalValue: 0 }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Zerion API key length: ${ZERION_API_KEY.length}`);
    console.log(`API key first 8 chars: ${ZERION_API_KEY.substring(0, 8)}`);
    console.log(`API key last 4 chars: ${ZERION_API_KEY.substring(ZERION_API_KEY.length - 4)}`);
    console.log(`Fetching portfolio for wallet: ${walletAddress}`);

    // Use Deno's base64 encoder for reliability
    const credentials = `${ZERION_API_KEY}:`;
    const encoder = new TextEncoder();
    const credentialsBytes = encoder.encode(credentials);
    const base64Credentials = base64Encode(credentialsBytes);
    const authHeader = `Basic ${base64Credentials}`;

    console.log(`Auth header (masked): Basic ${base64Credentials.substring(0, 16)}...`);

    // Fetch positions (fungible tokens)
    const positionsUrl = `https://api.zerion.io/v1/wallets/${walletAddress}/positions/?filter[positions]=only_simple&currency=usd&sort=value`;
    
    const positionsResponse = await fetch(positionsUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log(`Zerion API response status: ${positionsResponse.status}`);

    if (!positionsResponse.ok) {
      const errorText = await positionsResponse.text();
      console.error(`Zerion error: ${positionsResponse.status} - ${errorText}`);
      
      if (positionsResponse.status === 401) {
        console.error('=== 401 DEBUG ===');
        console.error(`Key length: ${ZERION_API_KEY.length}`);
        console.error(`Key prefix: ${ZERION_API_KEY.substring(0, 12)}`);
        console.error(`Key suffix: ${ZERION_API_KEY.substring(ZERION_API_KEY.length - 6)}`);
        console.error('Check: Key may need to be re-entered in Supabase secrets or regenerated in Zerion dashboard');
      }
      
      return new Response(
        JSON.stringify({ 
          tokens: [], 
          totalValue: 0, 
          error: `Zerion API error: ${positionsResponse.status}`,
          debug: {
            keyLength: ZERION_API_KEY.length,
            keyPrefix: ZERION_API_KEY.substring(0, 8),
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const positionsData = await positionsResponse.json();
    console.log(`Found ${positionsData.data?.length || 0} positions`);
    
    // Map ALL tokens - only filter by quantity > 0
    const tokens = (positionsData.data || []).map((position: any) => {
      const attributes = position.attributes;
      const fungibleInfo = attributes?.fungible_info;
      
      return {
        id: position.id,
        name: fungibleInfo?.name || 'Unknown Token',
        symbol: fungibleInfo?.symbol || '???',
        icon: fungibleInfo?.icon?.url || null,
        quantity: attributes?.quantity?.float || 0,
        value: typeof attributes?.value === 'number' ? attributes.value : 0,
        price: typeof attributes?.price === 'number' ? attributes.price : 0,
        chain: position.relationships?.chain?.data?.id || 'unknown',
        priceChange24h: attributes?.changes?.percent_1d || 0,
      };
    }).filter((token: any) => token.quantity > 0);

    const totalValue = tokens.reduce((sum: number, token: any) => sum + (token.value || 0), 0);

    console.log(`Returning ${tokens.length} tokens, total: $${totalValue.toFixed(2)}`);

    return new Response(
      JSON.stringify({ tokens, totalValue }),
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
