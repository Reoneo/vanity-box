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
    const { subdomain, domain: providedDomain } = await req.json();

    console.log('==========================================');
    console.log('📖 FETCHING NAMESTONE RECORDS');
    console.log('==========================================');
    console.log('📝 Subdomain:', subdomain);
    console.log('==========================================');

    if (!subdomain) {
      throw new Error('Missing subdomain parameter');
    }

    // Extract subdomain label and domain
    const parts = subdomain.split('.');
    const subdomainLabel = parts[0];
    const domain = providedDomain || parts.slice(1).join('.') || 'smith.cash';

    // Get API key for this domain
    const NAMESTONE_API_KEY = Deno.env.get(`NAMESTONE_API_KEY_${domain.toUpperCase().replace(/\./g, '_')}`) || Deno.env.get('NAMESTONE_API_KEY');
    
    if (!NAMESTONE_API_KEY) {
      throw new Error(`API key not configured for domain ${domain}`);
    }
    
    console.log('🔑 Using API key for domain:', domain);
    console.log('📝 Domain:', domain);
    
    const payload = {
      domain: domain.toLowerCase(),
      name: subdomainLabel
    };

    console.log('📤 Sending request to Namestone:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://namestone.com/api/public_v1/get-names', {
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
    console.log('✅ Records fetched successfully:', JSON.stringify(data, null, 2));

    // Extract text records from the response
    const records = Array.isArray(data) && data.length > 0 ? data[0] : data;
    const textRecords = records.text_records || {};

    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        textRecords,
        data,
        message: 'Records fetched successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-namestone-records function:', error);
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
