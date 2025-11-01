import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { toSafeError, ErrorCodes } from '../_shared/errors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { handle } = await req.json();
    
    if (!handle) {
      throw new Error('Handle is required');
    }

    const WEB3BIO_API_KEY = Deno.env.get('WEB3BIO_API_KEY');
    
    if (!WEB3BIO_API_KEY) {
      throw new Error('WEB3BIO_API_KEY not configured');
    }

    // Call web3.bio API
    const response = await fetch(`https://api.web3.bio/profile/${handle}`, {
      headers: {
        'Authorization': `Bearer ${WEB3BIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Web3.bio API error: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Determine appropriate error code based on error type
    let errorCode = ErrorCodes.EXTERNAL_API_ERROR;
    if (error instanceof Error) {
      if (error.message.includes('required')) {
        errorCode = ErrorCodes.INVALID_INPUT;
      } else if (error.message.includes('not configured')) {
        errorCode = ErrorCodes.DOMAIN_NOT_CONFIGURED;
      }
    }
    
    const safeError = toSafeError(error, errorCode);
    return new Response(
      JSON.stringify({ 
        error: safeError.message,
        code: safeError.code
      }), 
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
