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
    const { transactionId, reference } = await req.json();

    console.log('[verify-payment] Request received:', { 
      transactionId, 
      reference,
      timestamp: new Date().toISOString()
    });

    if (!transactionId || !reference) {
      return new Response(
        JSON.stringify({ error: 'Missing transaction_id or reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Verify reference exists in our database
    const { data: paymentRef, error: fetchError } = await supabase
      .from('payment_references')
      .select('*')
      .eq('reference', reference)
      .single();

    if (fetchError || !paymentRef) {
      console.error('[verify-payment] Reference not found:', reference, fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid payment reference' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-payment] Payment reference found in DB:', { 
      reference, 
      subdomain: paymentRef.subdomain, 
      domain: paymentRef.domain,
      status: paymentRef.status,
      paymentMethod: paymentRef.payment_method
    });

    // 2. Call World App Developer Portal API to verify transaction
    const appId = Deno.env.get('VITE_MINIKIT_APP_ID') || 'app_ed7e61cb0c52630464178eed59e3fbdd';
    const devPortalApiKey = Deno.env.get('DEV_PORTAL_API_KEY');

    if (!devPortalApiKey) {
      console.warn('[verify-payment] DEV_PORTAL_API_KEY not set, optimistic verification');
      // Optimistically accept if API key not configured (development mode)
      const { error: updateError } = await supabase
        .from('payment_references')
        .update({
          status: 'verified',
          transaction_id: transactionId,
          tx_hash: transactionId, // Use transaction_id as tx_hash for now
          verified_at: new Date().toISOString(),
        })
        .eq('reference', reference);

      if (updateError) {
        console.error('[verify-payment] Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update payment status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[verify-payment] Optimistic success:', reference);
      return new Response(
        JSON.stringify({ success: true, txHash: transactionId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Developer Portal API
    const verifyUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${appId}`;
    console.log('[verify-payment] Calling World App Developer Portal API:', verifyUrl);

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${devPortalApiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[verify-payment] Developer Portal error:', response.status, errorText);
      
      // Update status to failed
      await supabase
        .from('payment_references')
        .update({ status: 'failed' })
        .eq('reference', reference);

      return new Response(
        JSON.stringify({ error: `Payment verification failed: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = await response.json();
    console.log('[verify-payment] Developer Portal response:', { 
      status: transaction.status, 
      reference: transaction.reference,
      txHash: transaction.transaction_hash
    });

    // 3. Verify transaction matches our reference and is not failed
    if (transaction.reference !== reference) {
      console.error('[verify-payment] Reference mismatch:', transaction.reference, reference);
      await supabase
        .from('payment_references')
        .update({ status: 'failed' })
        .eq('reference', reference);

      return new Response(
        JSON.stringify({ error: 'Transaction reference mismatch' }),
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

    // 4. Optimistically confirm (accept if not failed, or poll until mined)
    // For now, we'll accept any non-failed status
    const txHash = transaction.transaction_hash || transactionId;
    
    console.log('[verify-payment] Verification successful, updating DB to verified');

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
      console.error('[verify-payment] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update payment status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-payment] Payment verified successfully:', { 
      reference, 
      txHash, 
      status: transaction.status 
    });

    return new Response(
      JSON.stringify({ success: true, txHash, status: transaction.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[verify-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
