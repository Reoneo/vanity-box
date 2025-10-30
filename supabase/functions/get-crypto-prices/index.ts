// Edge function to fetch cryptocurrency prices using CryptoCompare API (more reliable from edge functions)
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
    // Fetch prices from CryptoCompare API (free tier, no API key needed)
    const response = await fetch(
      'https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH,WLD,USDC&tsyms=USD',
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error('CryptoCompare API error:', response.status, await response.text());
      throw new Error('Failed to fetch crypto prices from CryptoCompare');
    }

    const data = await response.json();
    console.log('CryptoCompare response:', data);
    
    const prices = {
      eth: data.ETH?.USD || 2600,
      wld: data.WLD?.USD || 1.85,
      usdc: data.USDC?.USD || 1.0,
    };

    console.log('Processed prices:', prices);

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
    
    // Return updated fallback prices (closer to current market)
    return new Response(
      JSON.stringify({
        success: true,
        prices: {
          eth: 2600,
          wld: 1.85,
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
