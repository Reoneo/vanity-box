import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateInput, transactionIdSchema, uuidSchema } from "../_shared/validation.ts";
import { toSafeError, ErrorCodes, errorResponse } from "../_shared/errors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactionId, reference, walletAddress } = await req.json();

    console.log('[verify-payment] Request received from wallet:', walletAddress);

    if (!walletAddress) {
      return errorResponse(toSafeError(new Error('Wallet address required'), ErrorCodes.INVALID_INPUT), 400);
    }

    // Validate inputs
    const txIdValidation = validateInput(transactionIdSchema, transactionId);
    if (!txIdValidation.success) {
      return errorResponse(toSafeError(txIdValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    const refValidation = validateInput(uuidSchema, reference);
    if (!refValidation.success) {
      return errorResponse(toSafeError(refValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify reference exists
    const { data: paymentRef, error: fetchError } = await supabase
      .from('payment_references')
      .select('*')
      .eq('reference', reference)
      .eq('status', 'pending') // Only allow verifying pending payments
      .single();

    if (fetchError || !paymentRef) {
      console.error('[verify-payment] Reference not found or already processed');
      return errorResponse(toSafeError(new Error('Not found'), ErrorCodes.NOT_FOUND), 404);
    }

    // Verify wallet ownership
    if (walletAddress.toLowerCase() !== paymentRef.wallet_address.toLowerCase()) {
      console.error('[verify-payment] Wallet mismatch:', {
        provided: walletAddress,
        payment: paymentRef.wallet_address
      });
      return errorResponse(
        toSafeError(new Error('Wallet address mismatch'), ErrorCodes.UNAUTHORIZED), 
        403
      );
    }

    console.log('[verify-payment] Payment reference found and wallet verified');

    // Call World App Developer Portal API
    const appId = Deno.env.get('VITE_MINIKIT_APP_ID') || 'app_ed7e61cb0c52630464178eed59e3fbdd';
    const devPortalApiKey = Deno.env.get('DEV_PORTAL_API_KEY');

    if (!devPortalApiKey) {
      console.error('[verify-payment] DEV_PORTAL_API_KEY not configured');
      return errorResponse(
        toSafeError(new Error('Payment verification not configured'), ErrorCodes.INTERNAL_ERROR), 
        500
      );
    }

    // Verify with Developer Portal
    const verifyUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${appId}`;
    console.log('[verify-payment] Calling Developer Portal API');

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${devPortalApiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[verify-payment] Developer Portal error:', response.status);
      
      await supabase
        .from('payment_references')
        .update({ status: 'failed' })
        .eq('reference', reference)
        .eq('status', 'pending');

      return errorResponse(toSafeError(new Error('Payment verification failed'), ErrorCodes.PAYMENT_FAILED), 500);
    }

    const transaction = await response.json();
    console.log('[verify-payment] Developer Portal response received');

    // Verify transaction
    if (transaction.reference !== reference) {
      console.error('[verify-payment] Reference mismatch');
      await supabase
        .from('payment_references')
        .update({ status: 'failed' })
        .eq('reference', reference)
        .eq('status', 'pending');

      return errorResponse(toSafeError(new Error('Transaction reference mismatch'), ErrorCodes.PAYMENT_FAILED), 400);
    }

    if (transaction.status === 'failed') {
      console.error('[verify-payment] Transaction failed on chain');
      await supabase
        .from('payment_references')
        .update({ status: 'failed' })
        .eq('reference', reference)
        .eq('status', 'pending');

      return errorResponse(toSafeError(new Error('Transaction failed'), ErrorCodes.PAYMENT_FAILED), 400);
    }

    // Update payment status atomically
    const txHash = transaction.transaction_hash || transactionId;
    
    console.log('[verify-payment] Verification successful, updating DB');

    const { error: updateError } = await supabase
      .from('payment_references')
      .update({
        status: 'verified',
        transaction_id: transactionId,
        tx_hash: txHash,
        verified_at: new Date().toISOString(),
      })
      .eq('reference', reference)
      .eq('status', 'pending'); // Optimistic locking: only update if still pending

    if (updateError) {
      console.error('[verify-payment] Update error:', updateError);
      return errorResponse(toSafeError(updateError, ErrorCodes.DATABASE_ERROR), 500);
    }

    console.log('[verify-payment] Payment verified successfully');

    return new Response(
      JSON.stringify({ success: true, txHash, status: transaction.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return errorResponse(toSafeError(error, ErrorCodes.INTERNAL_ERROR), 500);
  }
});
