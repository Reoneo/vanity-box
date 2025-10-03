import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NAMESTONE_API_KEY = Deno.env.get('NAMESTONE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    console.log('Fetching domains for wallet:', walletAddress);

    if (!NAMESTONE_API_KEY) {
      throw new Error('NAMESTONE_API_KEY is not configured');
    }

    if (!walletAddress) {
      throw new Error('Missing wallet address');
    }

    // Fetch domains from Namestone API
    console.log('Calling Namestone get-names API');
    const namestoneResponse = await fetch('https://namestone.xyz/api/public_v1/get-names', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: walletAddress,
        chain_id: 480, // World Chain network ID
      }),
    });

    if (!namestoneResponse.ok) {
      const errorText = await namestoneResponse.text();
      console.error('Namestone API error:', errorText);
      throw new Error(`Namestone API error: ${namestoneResponse.status} - ${errorText}`);
    }

    const namestoneData = await namestoneResponse.json();
    console.log('Namestone response:', namestoneData);

    // Filter for smith.cash domains
    const smithDomains = namestoneData.names?.filter((name: any) => 
      name.domain === 'smith.cash'
    ) || [];

    console.log('Found smith.cash domains:', smithDomains.length);

    return new Response(
      JSON.stringify({
        success: true,
        domains: smithDomains,
        totalCount: smithDomains.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-user-domains function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
