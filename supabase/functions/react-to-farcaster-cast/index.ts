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
    const { signerUuid, reactionType, targetHash, action } = await req.json();

    if (!signerUuid || !reactionType || !targetHash || !action) {
      throw new Error('Missing required fields: signerUuid, reactionType, targetHash, action');
    }

    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    if (!NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY not configured');
    }

    console.log(`${action === 'add' ? 'Adding' : 'Removing'} ${reactionType} for cast:`, targetHash);

    const method = action === 'add' ? 'POST' : 'DELETE';
    const reactionResponse = await fetch('https://api.neynar.com/v2/farcaster/reaction', {
      method: method,
      headers: {
        'api_key': NEYNAR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        reaction_type: reactionType,
        target: targetHash,
      }),
    });

    if (!reactionResponse.ok) {
      const errorText = await reactionResponse.text();
      console.error('Neynar reaction failed:', errorText);
      throw new Error(`Failed to ${action} reaction: ${reactionResponse.statusText}`);
    }

    const reactionData = await reactionResponse.json();
    console.log(`✅ Reaction ${action}ed:`, reactionType);

    return new Response(JSON.stringify({
      success: true,
      reaction: reactionData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in react-to-farcaster-cast:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
