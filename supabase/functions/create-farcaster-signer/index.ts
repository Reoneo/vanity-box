import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { worldIdHash, fid } = await req.json();

    if (!worldIdHash || !fid) {
      throw new Error('Missing required fields: worldIdHash and fid');
    }

    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    if (!NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if signer already exists for this World ID
    const { data: existingSigner } = await supabase
      .from('farcaster_signers')
      .select('*')
      .eq('world_id_hash', worldIdHash)
      .single();

    if (existingSigner) {
      return new Response(JSON.stringify({
        signerUuid: existingSigner.signer_uuid,
        fid: existingSigner.fid,
        status: existingSigner.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new signer via Neynar API
    console.log('Creating signer for FID:', fid);
    const signerResponse = await fetch('https://api.neynar.com/v2/farcaster/signer', {
      method: 'POST',
      headers: {
        'api_key': NEYNAR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fid }),
    });

    if (!signerResponse.ok) {
      const errorText = await signerResponse.text();
      console.error('Neynar signer creation failed:', errorText);
      throw new Error(`Failed to create signer: ${signerResponse.statusText}`);
    }

    const signerData = await signerResponse.json();
    console.log('✅ Signer created:', signerData.signer_uuid);

    // Store signer in database
    const { data: newSigner, error: insertError } = await supabase
      .from('farcaster_signers')
      .insert({
        world_id_hash: worldIdHash,
        signer_uuid: signerData.signer_uuid,
        fid: fid,
        public_key: signerData.public_key,
        status: signerData.status || 'pending_approval'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store signer:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({
      signerUuid: newSigner.signer_uuid,
      fid: newSigner.fid,
      status: newSigner.status,
      publicKey: newSigner.public_key
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-farcaster-signer:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
