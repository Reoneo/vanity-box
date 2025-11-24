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
    // Check if request has proper content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    // Read body as text first, then parse
    const body = await req.text();
    if (!body || body.trim() === '') {
      throw new Error('Request body is empty');
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error('Invalid JSON in request body');
    }

    const { message, signature, nonce } = parsedBody;
    
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
