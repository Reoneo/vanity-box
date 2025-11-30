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
      throw new Error('Address is required');
    }

    console.log('Fetching EFP stats for address:', address);

    // Use the correct EFP API stats endpoint
    const efpResponse = await fetch(
      `https://api.ethfollow.xyz/api/v1/users/${address}/stats`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('EFP API response status:', efpResponse.status);

    let efpData = null;
    
    if (efpResponse.ok) {
      efpData = await efpResponse.json();
      console.log('EFP data fetched successfully:', JSON.stringify(efpData));
      
      // The EFP API returns followers_count and following_count (plural)
      return new Response(JSON.stringify({
        followers_count: efpData.followers_count || 0,
        following_count: efpData.following_count || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('User not found in EFP or API error, returning default values');
      // Return default values if user not found
      efpData = {
        followers_count: 0,
        following_count: 0
      };
    }

    return new Response(JSON.stringify(efpData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching EFP stats:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      followers_count: 0,
      following_count: 0
    }), {
      status: 200, // Return 200 with default values instead of error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
