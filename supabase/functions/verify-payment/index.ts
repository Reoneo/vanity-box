import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    
    if (!rawBody || rawBody.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transactionId, reference, walletAddress } = body;

    console.log('[verify-payment] Request received:', { 
      transactionId, 
      reference,
      hasWalletAddress: !!walletAddress,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!transactionId || !reference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate transaction ID format (should be a hex string)
    if (!/^0x[a-fA-F0-9]+$/.test(transactionId) && !/^[a-fA-F0-9-]+$/.test(transactionId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid transaction ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify reference exists and get payment details
    const { data: paymentRef, error: fetchError } = await supabase
      .from('payment_references')
      .select('*')
      .eq('reference', reference)
      .single();

    if (fetchError || !paymentRef) {
      console.error('[verify-payment] Reference not found:', reference);
      return new Response(
        JSON.stringify({ error: 'Invalid payment reference' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security: Verify the caller owns the wallet that initiated the payment
    if (walletAddress && paymentRef.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      console.error('[verify-payment] Wallet mismatch - attempted verification by different wallet');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent re-verification of already verified payments
    if (paymentRef.status === 'verified') {
      console.log('[verify-payment] Payment already verified:', reference);
      return new Response(
        JSON.stringify({ success: true, txHash: paymentRef.tx_hash, status: 'already_verified' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent verification of failed payments
    if (paymentRef.status === 'failed') {
      return new Response(
        JSON.stringify({ error: 'Payment has already failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-payment] Payment reference found:', { 
      reference, 
      subdomain: paymentRef.subdomain, 
      domain: paymentRef.domain,
      status: paymentRef.status
    });

    // Call World App Developer Portal API to verify transaction
    const appId = Deno.env.get('VITE_MINIKIT_APP_ID') || 'app_ed7e61cb0c52630464178eed59e3fbdd';
    const devPortalApiKey = Deno.env.get('DEV_PORTAL_API_KEY');

    // SECURITY: Require API key for production verification
    if (!devPortalApiKey) {
      console.error('[verify-payment] DEV_PORTAL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment verification unavailable. Please contact support.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Developer Portal API
    const verifyUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${appId}`;
    console.log('[verify-payment] Calling World App Developer Portal API');

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${devPortalApiKey}`,
      },
    });

    if (!response.ok) {
      console.error('[verify-payment] Developer Portal error:', response.status);
      
      // Update status to failed
      await supabase
        .from('payment_references')
        .update({ status: 'failed' })
        .eq('reference', reference);

      return new Response(
        JSON.stringify({ error: 'Payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = await response.json();
    console.log('[verify-payment] Developer Portal response:', { 
      status: transaction.status, 
      reference: transaction.reference
    });

    // Verify transaction matches our reference
    if (transaction.reference !== reference) {
      console.error('[verify-payment] Reference mismatch');
      await supabase
        .from('payment_references')
        .update({ status: 'failed' })
        .eq('reference', reference);

      return new Response(
        JSON.stringify({ error: 'Transaction verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (transaction.status === 'failed') {
      console.error('[verify-payment] Transaction failed on chain');
      await supabase
        .from('payment_references')
        .update({ status: 'failed' })
        .eq('reference', reference);

      return new Response(
        JSON.stringify({ error: 'Transaction failed on blockchain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment reference to verified
    const txHash = transaction.transaction_hash || transactionId;
    
    const { error: updateError } = await supabase
      .from('payment_references')
      .update({
        status: 'verified',
        transaction_id: transactionId,
        tx_hash: txHash,
        verified_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    if (updateError) {
      console.error('[verify-payment] Update error:', updateError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to update payment status. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-payment] Payment verified successfully:', reference);

    return new Response(
      JSON.stringify({ success: true, txHash, status: transaction.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[verify-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
