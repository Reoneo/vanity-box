import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    if (!subdomain) {
      throw new Error('Missing subdomain parameter');
    }

    // Extract subdomain label (e.g., "alice" from "alice.smith.cash")
    const subdomainLabel = subdomain.includes('.') ? subdomain.split('.')[0] : subdomain;
    const cleanDomain = String(domain).trim().toLowerCase(); // DO NOT strip $ - it's part of the domain name!
    
    console.log(`🔍 Parsed: label="${subdomainLabel}", domain="${cleanDomain}"`);
    
    // Fetch API key from domain_configs
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: domainConfig, error: configError } = await supabase
      .from("domain_configs")
      .select("*")
      .eq("domain_name", cleanDomain)
      .eq("status", "active")
      .maybeSingle();

    if (configError) {
      throw new Error(`Database error: ${configError.message}`);
    }

    let namestoneApiKey: string | undefined;

    if (domainConfig) {
      console.log(`🔑 Found domain config for ${cleanDomain}, secret: ${domainConfig.api_key_secret_name}`);
      namestoneApiKey = Deno.env.get(domainConfig.api_key_secret_name);
    } else {
      console.log(`🔑 No domain config found for ${cleanDomain}, using default`);
      namestoneApiKey = Deno.env.get("NAMESTONE_API_KEY");
    }

    if (!namestoneApiKey) {
      throw new Error(`API key not configured for domain ${cleanDomain}`);
    }
    
    // URL-encode the domain for GET request (handles special characters like $)
    const url = `https://namestone.com/api/public_v1/get-names?domain=${encodeURIComponent(cleanDomain)}`;

    console.log('📤 Sending request to Namestone:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': namestoneApiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 Namestone response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NAMESTONE API ERROR');
      console.error('Status:', response.status);
      console.error('Error message:', errorText);
      
      // If domain returns 401, it means API key mismatch or domain not configured
      if (response.status === 401) {
        console.error(`⚠️ API key not authorized for domain "${cleanDomain}"`);
        // Return 200 with a structured failure so the frontend can handle gracefully
        return new Response(
          JSON.stringify({
            success: false,
            domain: cleanDomain,
            error: `API key not authorized for domain "${cleanDomain}". Please verify domain configuration.`,
            reasonCode: 'UNAUTHORIZED_DOMAIN'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
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
        domain: cleanDomain,
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