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

    // First, get the user's details from leaderboard to find their stats
    const leaderboardResponse = await fetch(
      `https://api.ethfollow.xyz/api/v1/users/${address}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    let efpData = null;
    
    if (leaderboardResponse.ok) {
      efpData = await leaderboardResponse.json();
      console.log('EFP data fetched successfully:', efpData);
    } else {
      console.log('User not found in EFP, returning default values');
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
