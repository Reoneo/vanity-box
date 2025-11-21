import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching POAP holders for event:', eventId);

    const poapApiKey = Deno.env.get('POAP_API_KEY');

    if (!poapApiKey) {
      console.error('POAP API key not configured');
      return new Response(
        JSON.stringify({ error: 'POAP API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch all holders using pagination
    const limit = 100; // Actual maximum enforced by POAP API
    let offset = 0;
    let allHolders = [];
    let hasMore = true;

    while (hasMore) {
      const holdersResponse = await fetch(
        `https://api.poap.tech/event/${eventId}/poaps?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'X-API-Key': poapApiKey,
            'Accept': 'application/json',
          },
        }
      );

      console.log(`POAP API response status (offset ${offset}):`, holdersResponse.status);

      if (!holdersResponse.ok) {
        const error = await holdersResponse.text();
        console.error('Failed to fetch POAP holders:', error);
        
        // If we already have some holders, return them instead of erroring
        if (allHolders.length > 0) {
          console.log(`⚠️ Partial fetch - returning ${allHolders.length} holders collected so far`);
          break;
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to fetch holders from API' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const responseData = await holdersResponse.json();
      
      // Handle different response structures
      let holders = [];
      if (Array.isArray(responseData)) {
        holders = responseData;
      } else if (responseData && typeof responseData === 'object') {
        holders = responseData.tokens || responseData.poaps || responseData.data || [];
      }

      // Add to total collection
      allHolders = [...allHolders, ...holders];
      
      console.log(`Fetched ${holders.length} holders (offset: ${offset}, total: ${allHolders.length})`);
      
      // Check if there are more results
      if (holders.length === 0) {
        hasMore = false; // No more pages
      } else {
        offset += limit; // Move to next page
      }
    }
    
    console.log(`✅ Fetched all ${allHolders.length} holders for event ${eventId}`);
    if (allHolders.length > 0) {
      console.log('First holder sample:', JSON.stringify(allHolders[0]));
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        count: allHolders.length,
        holders: allHolders 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-poap-holders function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
