import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API key will be fetched based on domain

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, toAddress } = await req.json();

    console.log('==========================================');
    console.log('🔄 STARTING DOMAIN TRANSFER PROCESS');
    console.log('==========================================');
    console.log('📝 Subdomain:', subdomain);
    console.log('👛 To Address:', toAddress);
    console.log('==========================================');

    if (!subdomain || !toAddress) {
      throw new Error('Missing required parameters: subdomain and toAddress');
    }

    // Parse subdomain to extract label and domain
    const parts = subdomain.split('.');
    const subdomainLabel = parts[0];
    const domainFromSubdomain = parts.slice(1).join('.');
    
    console.log('🏷️  Subdomain label:', subdomainLabel);
    console.log('🌐 Domain:', domainFromSubdomain);

    // Get API key for this domain
    const NAMESTONE_API_KEY = Deno.env.get(`NAMESTONE_API_KEY_${domainFromSubdomain.toUpperCase().replace(/\./g, '_')}`) || Deno.env.get('NAMESTONE_API_KEY');
    
    if (!NAMESTONE_API_KEY) {
      throw new Error(`API key not configured for domain ${domainFromSubdomain}`);
    }
    
    console.log('🔑 Using API key for domain:', domainFromSubdomain);

    const namestonePayload = {
      domain: (domainFromSubdomain || 'smith.cash').toLowerCase(),
      name: subdomainLabel,
      address: toAddress,
      chain_id: 480, // World Chain network ID
    };
    
    console.log('📤 Sending transfer request to Namestone:', JSON.stringify(namestonePayload, null, 2));
    
    const namestoneResponse = await fetch('https://namestone.com/api/public_v1/set-name', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(namestonePayload),
    });

    console.log('📥 Namestone response status:', namestoneResponse.status);
    
    if (!namestoneResponse.ok) {
      const errorText = await namestoneResponse.text();
      console.error('❌ NAMESTONE API ERROR');
      console.error('Status:', namestoneResponse.status);
      console.error('Error message:', errorText);
      throw new Error(`Namestone API error: ${namestoneResponse.status} - ${errorText}`);
    }

    const namestoneData = await namestoneResponse.json();
    console.log('✅ Namestone response:', JSON.stringify(namestoneData, null, 2));
    console.log('✅ Domain transferred successfully via Namestone');

    console.log('\n==========================================');
    console.log('🎉 DOMAIN TRANSFER COMPLETE');
    console.log('==========================================');
    
    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        newAddress: toAddress,
        namestoneData,
        message: 'Domain transferred successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in transfer-namestone-name function:', error);
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
