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
    const { message, signature, nonce } = await req.json();
    
    console.log('🔐 Verifying SIWE message', { nonce });

    if (!message || !signature || !nonce) {
      throw new Error('Missing required fields: message, signature, nonce');
    }

    // Parse SIWE message to extract address
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      throw new Error('Invalid SIWE message: no address found');
    }

    const address = addressMatch[0];
    
    // Verify the nonce in the message matches
    if (!message.includes(nonce)) {
      throw new Error('Nonce mismatch');
    }

    console.log('✅ SIWE verification successful', { address });

    return new Response(JSON.stringify({ 
      success: true, 
      address,
      verified: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error verifying SIWE:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
