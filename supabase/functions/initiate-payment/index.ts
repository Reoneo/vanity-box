import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, verifyWalletOwnership } from '../_shared/auth.ts';
import { toSafeError, ErrorCodes, errorResponse } from '../_shared/errors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      console.error('[initiate-payment] Unauthorized:', authResult.error);
      return errorResponse(
        toSafeError(new Error('Unauthorized'), ErrorCodes.UNAUTHORIZED), 
        401
      );
    }

    const { subdomain, domain, walletAddress, paymentAmount, paymentMethod } = await req.json();

    // Verify wallet ownership
    if (!verifyWalletOwnership(authResult, walletAddress)) {
      console.error('[initiate-payment] Wallet mismatch:', {
        authenticated: authResult.walletAddress,
        requested: walletAddress
      });
      return errorResponse(
        toSafeError(new Error('Wallet address mismatch'), ErrorCodes.UNAUTHORIZED), 
        403
      );
    }

    console.log('[initiate-payment] Request received:', { 
      subdomain, 
      domain, 
      walletAddress, 
      paymentAmount, 
      paymentMethod,
      timestamp: new Date().toISOString()
    });

    // Validate inputs
    if (!subdomain || !domain || !walletAddress || paymentAmount === undefined || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique reference ID (UUID without dashes for compatibility)
    const reference = crypto.randomUUID().replace(/-/g, '');
    console.log('[initiate-payment] Generated reference:', reference);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store payment reference in database
    const { error: insertError } = await supabase
      .from('payment_references')
      .insert({
        reference,
        subdomain,
        domain,
        wallet_address: walletAddress,
        payment_amount: paymentAmount,
        payment_method: paymentMethod,
        status: 'pending',
      });

    if (insertError) {
      console.error('[initiate-payment] Database error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment reference' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[initiate-payment] Payment reference created in DB:', {
      reference,
      subdomain,
      status: 'pending'
    });

    console.log('[initiate-payment] Returning reference to client:', reference);

    return new Response(
      JSON.stringify({ reference }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[initiate-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
