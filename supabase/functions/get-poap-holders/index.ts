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

    const poapClientId = Deno.env.get('POAP_CLIENT_ID');
    const poapClientSecret = Deno.env.get('POAP_CLIENT_SECRET');

    if (!poapClientId || !poapClientSecret) {
      console.error('POAP credentials not configured');
      return new Response(
        JSON.stringify({ error: 'POAP API credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get access token
    const tokenResponse = await fetch('https://poapauth.auth0.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audience: 'https://api.poap.tech',
        grant_type: 'client_credentials',
        client_id: poapClientId,
        client_secret: poapClientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Failed to get POAP access token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with POAP API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Fetch holders for the event
    const holdersResponse = await fetch(
      `https://api.poap.tech/event/${eventId}/poaps`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-API-Key': poapClientId,
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
