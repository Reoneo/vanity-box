import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching POAPs for wallet:', walletAddress);

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

    // First, get access token
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

    // Fetch POAPs for the wallet
    const poapsResponse = await fetch(
      `https://api.poap.tech/actions/scan/${walletAddress}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-API-Key': poapClientId,
        },
      }
    );

    if (!poapsResponse.ok) {
      const error = await poapsResponse.text();
      console.error('Failed to fetch POAPs:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch POAPs from API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const poaps = await poapsResponse.json();
    console.log(`Found ${poaps.length} POAPs for wallet ${walletAddress}`);

    // Store POAPs in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare POAP data for insertion
    const poapData = poaps.map((poap: any) => ({
      wallet_address: walletAddress.toLowerCase(),
      event_id: poap.event.id,
      token_id: poap.tokenId,
      event_name: poap.event.name,
      event_description: poap.event.description,
      event_image_url: poap.event.image_url,
      event_year: poap.event.year,
      event_start_date: poap.event.start_date,
      event_end_date: poap.event.end_date,
      owner: poap.owner,
      chain: poap.chain,
    }));

    // Upsert POAPs (update if exists, insert if not)
    const { error: dbError } = await supabase
      .from('poap_tokens')
      .upsert(poapData, { 
        onConflict: 'token_id',
        ignoreDuplicates: false 
      });

    if (dbError) {
      console.error('Error storing POAPs:', dbError);
      // Still return the POAPs even if storage fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        count: poaps.length,
        poaps: poaps 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-poap-data function:', error);
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
