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

    // Fetch holders for the event using X-API-Key header
    const holdersResponse = await fetch(
      `https://api.poap.tech/event/${eventId}/poaps`,
      {
        headers: {
          'X-API-Key': poapApiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!holdersResponse.ok) {
      const error = await holdersResponse.text();
      console.error('Failed to fetch POAP holders:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch holders from API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const holders = await holdersResponse.json();
    console.log(`Found ${holders.length} holders for event ${eventId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: holders.length,
        holders: holders 
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
