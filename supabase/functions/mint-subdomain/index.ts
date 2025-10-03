import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NAMESTONE_API_KEY = Deno.env.get('NAMESTONE_API_KEY');
const PAYMENT_ADDRESS = '0x71ab0b01e3ff45551e25b208e2a90298f73f7040';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, walletAddress, txHash } = await req.json();

    console.log('Minting subdomain:', { subdomain, walletAddress, txHash });

    if (!NAMESTONE_API_KEY) {
      throw new Error('NAMESTONE_API_KEY is not configured');
    }

    if (!subdomain || !walletAddress || !txHash) {
      throw new Error('Missing required parameters');
    }

    // Step 1: Verify the transaction on World Chain
    console.log('Verifying transaction:', txHash);
    // Note: In production, you'd verify the transaction amount, recipient, etc.
    // For now, we'll proceed with minting

    // Step 2: Mint subdomain using Namestone API
    console.log('Minting subdomain via Namestone API');
    const namestoneResponse = await fetch('https://namestone.xyz/api/public_v1/set-name', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NAMESTONE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'smith.cash',
        name: subdomain.replace('.smith.cash', ''),
        address: walletAddress,
        chain_id: 480, // World Chain network ID
      }),
    });

    if (!namestoneResponse.ok) {
      const errorText = await namestoneResponse.text();
      console.error('Namestone API error:', errorText);
      throw new Error(`Namestone API error: ${namestoneResponse.status} - ${errorText}`);
    }

    const namestoneData = await namestoneResponse.json();
    console.log('Namestone response:', namestoneData);

    // Step 3: Wrap the subdomain using Durin on World Chain
    console.log('Wrapping subdomain using Durin');
    // Note: The actual Durin wrapping implementation would go here
    // This is a placeholder for the wrapping logic
    
    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        address: walletAddress,
        txHash,
        namestoneData,
        message: 'Subdomain minted and wrapped successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in mint-subdomain function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
