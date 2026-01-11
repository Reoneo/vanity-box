import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hashMessage, recoverAddress } from "https://esm.sh/viem@2.37.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify wallet ownership via signature
 */
async function verifyWalletOwnership(
  walletAddress: string, 
  signature: string, 
  message: string
): Promise<boolean> {
  try {
    const messageHash = hashMessage(message);
    const recoveredAddress = await recoverAddress({
      hash: messageHash,
      signature: signature as `0x${string}`,
    });
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (e) {
    console.error('[initiate-payment] Signature verification error:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { subdomain, domain, walletAddress, paymentAmount, paymentMethod, signature, signatureMessage } = body;

    console.log('[initiate-payment] Request received:', { 
      subdomain, 
      domain, 
      walletAddress, 
      paymentAmount, 
      paymentMethod,
      hasSignature: !!signature,
      timestamp: new Date().toISOString()
    });

    // Validate required inputs
    if (!subdomain || !domain || !walletAddress || paymentAmount === undefined || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate subdomain format
    const subdomainLabel = subdomain.split('.')[0].toLowerCase();
    if (!/^[a-z0-9-]{1,63}$/.test(subdomainLabel)) {
      return new Response(
        JSON.stringify({ error: 'Invalid subdomain format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment amount is positive
    if (typeof paymentAmount !== 'number' || paymentAmount < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment method
    const validPaymentMethods = ['WLD', 'USDC', 'ETH', 'FREE'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-free mints, require wallet signature verification
    if (paymentMethod !== 'FREE' && paymentAmount > 0) {
      if (!signature || !signatureMessage) {
        return new Response(
          JSON.stringify({ error: 'Wallet signature required for payments' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the signature proves wallet ownership
      const isValidSignature = await verifyWalletOwnership(walletAddress, signature, signatureMessage);
      if (!isValidSignature) {
        console.error('[initiate-payment] Invalid wallet signature');
        return new Response(
          JSON.stringify({ error: 'Invalid wallet signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[initiate-payment] Wallet signature verified');
    }

    // Generate unique reference ID
    const reference = crypto.randomUUID().replace(/-/g, '');
    console.log('[initiate-payment] Generated reference:', reference);

    // Initialize Supabase client with service role for writes
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store payment reference in database
    const { error: insertError } = await supabase
      .from('payment_references')
      .insert({
        reference,
        subdomain: subdomainLabel,
        domain: domain.toLowerCase(),
        wallet_address: walletAddress.toLowerCase(),
        payment_amount: paymentAmount,
        payment_method: paymentMethod,
        status: 'pending',
      });

    if (insertError) {
      console.error('[initiate-payment] Database error:', insertError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment reference. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[initiate-payment] Payment reference created:', reference);

    return new Response(
      JSON.stringify({ reference }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[initiate-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
