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
    const { signerUuid, text, parent } = await req.json();

    if (!signerUuid || !text) {
      throw new Error('Missing required fields: signerUuid and text');
    }

    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    if (!NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY not configured');
    }

    // Validate text length (Farcaster limit is 320 characters)
    if (text.length > 320) {
      throw new Error('Cast text exceeds 320 character limit');
    }

    console.log('Publishing cast for signer:', signerUuid);
    
    const requestBody: any = {
      signer_uuid: signerUuid,
      text: text,
    };

    // Add parent if it's a reply
    if (parent) {
      requestBody.parent = parent;
    }

    const castResponse = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: {
        'api_key': NEYNAR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!castResponse.ok) {
      const errorText = await castResponse.text();
      console.error('Neynar cast publishing failed:', errorText);
      throw new Error(`Failed to publish cast: ${castResponse.statusText}`);
    }

    const castData = await castResponse.json();
    console.log('✅ Cast published:', castData.cast?.hash);

    return new Response(JSON.stringify({
      success: true,
      cast: castData.cast
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in publish-farcaster-cast:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
