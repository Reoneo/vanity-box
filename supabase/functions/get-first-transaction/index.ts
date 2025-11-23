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
    const { address } = await req.json();

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const ETHERSCAN_API_KEY = Deno.env.get('ETHERSCAN_API_KEY');
    
    if (!ETHERSCAN_API_KEY) {
      console.error('ETHERSCAN_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Etherscan API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch first transaction using Etherscan API
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.result && data.result.length > 0) {
      const firstTx = data.result[0];
      const timestamp = parseInt(firstTx.timeStamp) * 1000; // Convert to milliseconds
      
      return new Response(
        JSON.stringify({
          timestamp,
          date: new Date(timestamp).toISOString(),
          blockNumber: firstTx.blockNumber,
          hash: firstTx.hash
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'No transactions found',
        timestamp: null,
        date: null
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching first transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
