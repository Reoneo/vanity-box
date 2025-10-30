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
    const { subdomain, walletAddress, textRecords, coinTypes, contenthash } = await req.json();

    console.log('==========================================');
    console.log('🔄 UPDATING NAMESTONE RECORDS');
    console.log('==========================================');
    console.log('📝 Subdomain:', subdomain);
    console.log('👛 Wallet Address:', walletAddress);
    console.log('📋 Text Records:', textRecords);
    console.log('==========================================');

    if (!subdomain || !walletAddress) {
      throw new Error('Missing required parameters');
    }

    // Extract subdomain label and domain
    const parts = subdomain.split('.');
    const subdomainLabel = parts[0];
    const domain = parts.slice(1).join('.') || 'smith.cash';

    // Get API key for this domain
    const NAMESTONE_API_KEY = Deno.env.get(`NAMESTONE_API_KEY_${domain.toUpperCase().replace(/\./g, '_')}`) || Deno.env.get('NAMESTONE_API_KEY');
    
    if (!NAMESTONE_API_KEY) {
      throw new Error(`API key not configured for domain ${domain}`);
    }
    
    console.log('🔑 Using API key for domain:', domain);
    
    // Use the set-names endpoint (batch) for setting records
    const payload = {
      domain: domain.toLowerCase(),
      names: [
        {
          name: subdomainLabel,
          address: walletAddress,
          text_records: textRecords || {},
          coin_types: coinTypes || {},
          contenthash: contenthash || undefined
        }
      ]
    };

    console.log('📤 Sending request to Namestone set-names endpoint:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://namestone.xyz/api/public_v1/set-names', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Namestone response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NAMESTONE API ERROR');
      console.error('Status:', response.status);
      console.error('Error message:', errorText);
      throw new Error(`Namestone API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Records updated successfully:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        data,
        message: 'Records updated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in set-namestone-records function:', error);
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