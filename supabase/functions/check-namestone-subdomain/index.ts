import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NAMESTONE_API_KEY = Deno.env.get('NAMESTONE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, domain = 'smith.cash' } = await req.json();

    console.log('==========================================');
    console.log('🔍 CHECKING NAMESTONE SUBDOMAIN');
    console.log('==========================================');
    console.log('📝 Subdomain:', subdomain);
    console.log('📝 Domain:', domain);
    console.log('==========================================');

    if (!NAMESTONE_API_KEY) {
      throw new Error('NAMESTONE_API_KEY is not configured');
    }

    if (!subdomain) {
      throw new Error('Missing subdomain parameter');
    }

    // Extract subdomain label (e.g., "alice" from "alice.smith.cash")
    const subdomainLabel = subdomain.includes('.') ? subdomain.split('.')[0] : subdomain;
    
    const url = `https://namestone.xyz/api/public_v1/get-names?domain=${domain}`;

    console.log('📤 Sending request to Namestone:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': NAMESTONE_API_KEY,
        'Content-Type': 'application/json',
      },
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
    console.log('✅ Data fetched successfully');

    // Check if the subdomain exists in the list
    const exists = Array.isArray(data) && data.some(
      (item: any) => item.name?.toLowerCase() === subdomainLabel.toLowerCase()
    );

    console.log(`🎯 Subdomain "${subdomainLabel}" exists:`, exists);

    return new Response(
      JSON.stringify({
        success: true,
        subdomain: subdomainLabel,
        domain,
        exists,
        message: exists ? 'Subdomain already exists' : 'Subdomain is available'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in check-namestone-subdomain function:', error);
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
