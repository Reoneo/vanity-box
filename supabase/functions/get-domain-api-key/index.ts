import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      throw new Error('Missing domain parameter');
    }

    console.log('🔑 Fetching API key for domain:', domain);

    // Create Supabase client to query domain_configs
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query the domain_configs table
    const { data: domainConfig, error: dbError } = await supabase
      .from('domain_configs')
      .select('api_key_secret_name, status')
      .eq('domain_name', domain.toLowerCase())
      .single();

    if (dbError || !domainConfig) {
      console.error('Domain not found in configs:', dbError);
      throw new Error(`Domain ${domain} not configured`);
    }

    if (domainConfig.status !== 'active') {
      throw new Error(`Domain ${domain} is not active`);
    }

    // Get the API key from environment using the secret name
    const apiKey = Deno.env.get(domainConfig.api_key_secret_name);

    if (!apiKey) {
      console.error(`Secret ${domainConfig.api_key_secret_name} not found in environment`);
      throw new Error(`API key not configured for domain ${domain}`);
    }

    console.log('✅ API key found for domain:', domain);

    return new Response(
      JSON.stringify({
        success: true,
        apiKey,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-domain-api-key:', error);
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
