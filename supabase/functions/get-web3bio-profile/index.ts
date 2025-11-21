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
    // Add error handling for empty or invalid request body
    let handle;
    try {
      const body = await req.json();
      handle = body?.handle;
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body. Expected JSON with "handle" field.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('🔍 Web3.bio lookup request for handle:', handle);
    
    if (!handle) {
      throw new Error('Handle is required');
    }

    const WEB3BIO_API_KEY = Deno.env.get('WEB3BIO_API_KEY');
    
    if (!WEB3BIO_API_KEY) {
      console.error('❌ WEB3BIO_API_KEY not configured');
      throw new Error('WEB3BIO_API_KEY not configured');
    }

    // Call web3.bio API
    const apiUrl = `https://api.web3.bio/profile/${handle}`;
    console.log('📡 Calling Web3.bio API:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${WEB3BIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 Web3.bio response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Web3.bio API error:', response.status, errorText);
      throw new Error(`Web3.bio API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Web3.bio profile data received:', JSON.stringify(data).substring(0, 200));

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error fetching web3.bio profile:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
