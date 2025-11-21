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
    let handle;
    let requestBody;
    
    // Check if request has a body at all
    const contentLength = req.headers.get('content-length');
    if (contentLength === '0' || contentLength === null) {
      console.error('❌ No request body (Content-Length is 0 or missing)');
      return new Response(JSON.stringify({ 
        error: 'Request body is required. Please provide JSON with a "handle" field.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Parse request body safely
    try {
      requestBody = await req.json();
      handle = requestBody?.handle;
      
      console.log('🔍 Web3.bio lookup request received:', { handle, fullBody: requestBody });
      
    } catch (parseError) {
      console.error('❌ Failed to parse request JSON:', parseError?.message);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body. Please ensure the body is valid JSON.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate handle field
    if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
      console.error('❌ Invalid or missing handle field:', { handle, requestBody });
      return new Response(JSON.stringify({ 
        error: 'The "handle" field is required and must be a non-empty string.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
