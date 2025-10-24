// Edge function to proxy CoinGecko API requests to avoid CORS issues
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch prices from CoinGecko API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,worldcoin-wld,usd-coin&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch crypto prices from CoinGecko');
    }

    const data = await response.json();
    
    const prices = {
      eth: data.ethereum?.usd || 2500,
      wld: data['worldcoin-wld']?.usd || 2.0,
      usdc: data['usd-coin']?.usd || 1.0,
    };

    return new Response(
      JSON.stringify({ success: true, prices }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    
    // Return fallback prices
    return new Response(
      JSON.stringify({
        success: true,
        prices: {
          eth: 2500,
          wld: 2.0,
          usdc: 1.0,
        },
        fallback: true,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
