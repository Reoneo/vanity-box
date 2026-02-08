// Edge Function: Create Holder DID
// Generates a DID for the holder based on their wallet address

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple DID generation using wallet address and timestamp
function generateDid(walletAddress: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const identifier = `${walletAddress.slice(2, 18)}${timestamp.toString(36)}${random}`;
  return `did:vanity:iota:${identifier}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a DID for the holder
    // In a production environment, this would use IOTA Identity library
    const holderDid = generateDid(walletAddress);

    console.log(`✅ Created DID for wallet ${walletAddress.slice(0, 10)}...: ${holderDid}`);

    return new Response(
      JSON.stringify({ 
        holderDid,
        createdAt: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('❌ Error creating DID:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create DID' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
