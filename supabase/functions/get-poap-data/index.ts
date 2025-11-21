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

    // Fetch POAPs using X-API-Key (open endpoint)
    console.log('Calling POAP API:', `https://api.poap.tech/actions/scan/${walletAddress}`);
    
    const poapsResponse = await fetch(
      `https://api.poap.tech/actions/scan/${walletAddress}`,
      {
        headers: {
          'X-API-Key': poapApiKey,
          'Accept': 'application/json',
        },
      }
    );

    console.log('POAP API response status:', poapsResponse.status);

    if (!poapsResponse.ok) {
      const errorText = await poapsResponse.text();
      console.error('POAP API error status:', poapsResponse.status);
      console.error('POAP API error body:', errorText);
      console.error('POAP API error headers:', JSON.stringify(Object.fromEntries(poapsResponse.headers.entries())));
      
      // Return success:false with 200 status so the UI doesn't crash
      // This allows the app to continue functioning without POAPs
      return new Response(
        JSON.stringify({ 
          success: false,
          count: 0,
          error: 'Failed to fetch POAPs from API',
          details: errorText,
          status: poapsResponse.status
        }),
        { 
          status: 200, 
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
