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
    const { subdomain, domain, walletAddress, paymentAmount, paymentMethod } = await req.json();

    console.log('[initiate-payment] Request:', { subdomain, domain, walletAddress, paymentAmount, paymentMethod });

    // Validate inputs
    if (!subdomain || !domain || !walletAddress || paymentAmount === undefined || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique reference ID (UUID without dashes for compatibility)
    const reference = crypto.randomUUID().replace(/-/g, '');

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

    console.log('[initiate-payment] Success - reference:', reference);

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
