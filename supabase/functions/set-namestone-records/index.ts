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

    // Extract subdomain label and domain - PRESERVE $ in domain names
    const parts = subdomain.split('.');
    const subdomainLabel = parts[0].trim().toLowerCase();
    const cleanDomain = (parts.slice(1).join('.') || 'smith.cash').trim().toLowerCase(); // DO NOT strip $ - it's part of the domain name!

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
    
    console.log('🔑 API key resolved for domain:', cleanDomain);
    
    // Use the set-names endpoint (batch) for setting records
    const payload = {
      domain: cleanDomain,
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

    const response = await fetch('https://namestone.com/api/public_v1/set-names', {
      method: 'POST',
      headers: {
        'Authorization': namestoneApiKey,
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
      
      // Provide clearer error for 401 (authorization issues)
      if (response.status === 401) {
        throw new Error(`API key not authorized for domain "${cleanDomain}". Please verify domain configuration.`);
      }
      
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
