import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Strip .limo suffix if present (ENS gateway suffix)
    let cleanSubdomain = subdomain;
    if (cleanSubdomain.endsWith('.limo')) {
      cleanSubdomain = cleanSubdomain.slice(0, -5);
      console.log('📝 Stripped .limo suffix, clean subdomain:', cleanSubdomain);
    }
    
    // Extract subdomain label and domain
    const parts = cleanSubdomain.split('.');
    const subdomainLabel = parts[0];
    const domain = providedDomain || parts.slice(1).join('.') || 'smith.cash';
    const cleanDomain = domain.trim().toLowerCase();

    console.log(`🔍 Parsed: label="${subdomainLabel}", domain="${cleanDomain}"`);

    // Initialize Supabase client for domain config lookup
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch API key from domain_configs (same pattern as set-namestone-records)
    const { data: domainConfig, error: configError } = await supabase
      .from("domain_configs")
      .select("*")
      .eq("domain_name", cleanDomain)
      .eq("status", "active")
      .maybeSingle();

    if (configError) {
      console.warn('⚠️ Domain config lookup error:', configError.message);
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
    
    const payload = {
      domain: cleanDomain,
      name: subdomainLabel
    };

    console.log('📤 Sending request to Namestone:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://namestone.com/api/public_v1/get-names', {
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
      throw new Error(`Namestone API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Records fetched successfully:', JSON.stringify(data, null, 2));

    // Extract text records from the response
    const records = Array.isArray(data) && data.length > 0 ? data[0] : data;
    const rawTextRecords = records.text_records || {};

    // SECURITY: Filter out metadata fields that should never be displayed/editable
    // These are managed by the backend/contract only
    const metadataBlacklist = [
      'registration_months',
      'expiry_date',
      'grace_period_end',
      'registration_date',
      'created_at',
      'updated_at',
      'minted_at',
      'is_expired',
      'payment_amount',
      'network_fee',
      'tx_hash',
      'payment_method'
    ];

    const textRecords: Record<string, string> = {};
    Object.entries(rawTextRecords).forEach(([key, value]) => {
      if (!metadataBlacklist.includes(key)) {
        textRecords[key] = value as string;
      } else {
        console.log(`🔒 Filtering out metadata field: ${key}`);
      }
    });

    console.log('📋 Filtered text records:', textRecords);
    
    // Extract owner/address from the main record
    // Namestone API returns the wallet address in the 'address' field
    let owner = records.address || records.owner || records.eth_address || null;
    
    // FALLBACK: If no owner found in Namestone, check minted_domains table
    if (!owner || owner === '') {
      console.log('⚠️ No address in Namestone response, checking minted_domains table...');
      
      try {
        const fullName = cleanSubdomain.toLowerCase();
        
        const { data: mintedData, error: mintedError } = await supabase
          .from('minted_domains')
          .select('wallet_address')
          .eq('full_name', fullName)
          .eq('is_expired', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (mintedError) {
          console.warn('⚠️ Error fetching from minted_domains:', mintedError.message);
        } else if (mintedData?.wallet_address) {
          owner = mintedData.wallet_address;
          console.log('✅ Got owner from minted_domains:', owner);
        } else {
          console.log('ℹ️ No matching record in minted_domains for:', fullName);
        }
      } catch (dbError) {
        console.warn('⚠️ Database fallback failed:', dbError);
      }
    }
    
    console.log('👤 Final owner address:', owner);
    console.log('📊 Full record structure:', JSON.stringify(records, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        textRecords,
        owner,
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
