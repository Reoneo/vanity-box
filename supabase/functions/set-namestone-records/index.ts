import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateInput, subdomainSchema, domainSchema, ethereumAddressSchema, textRecordsSchema, coinTypesSchema, contenthashSchema } from "../_shared/validation.ts";
import { toSafeError, ErrorCodes, errorResponse } from "../_shared/errors.ts";
import { verifyAuth, verifyWalletOwnership } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      console.error('[set-namestone-records] Unauthorized:', authResult.error);
      return errorResponse(
        toSafeError(new Error('Unauthorized'), ErrorCodes.UNAUTHORIZED), 
        401
      );
    }

    const { subdomain, walletAddress, textRecords, coinTypes, contenthash } = await req.json();

    // Verify wallet ownership
    if (!verifyWalletOwnership(authResult, walletAddress)) {
      console.error('[set-namestone-records] Wallet mismatch:', {
        authenticated: authResult.walletAddress,
        requested: walletAddress
      });
      return errorResponse(
        toSafeError(new Error('Wallet address mismatch'), ErrorCodes.UNAUTHORIZED), 
        403
      );
    }

    console.log('🔄 UPDATING NAMESTONE RECORDS');

    // Validate inputs
    const subdomainValidation = validateInput(subdomainSchema, subdomain);
    if (!subdomainValidation.success) {
      return errorResponse(toSafeError(subdomainValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    const addressValidation = validateInput(ethereumAddressSchema, walletAddress);
    if (!addressValidation.success) {
      return errorResponse(toSafeError(addressValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    const textRecordsValidation = validateInput(textRecordsSchema, textRecords);
    if (!textRecordsValidation.success) {
      return errorResponse(toSafeError(textRecordsValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    const coinTypesValidation = validateInput(coinTypesSchema, coinTypes);
    if (!coinTypesValidation.success) {
      return errorResponse(toSafeError(coinTypesValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    const contenthashValidation = validateInput(contenthashSchema, contenthash);
    if (!contenthashValidation.success) {
      return errorResponse(toSafeError(contenthashValidation.error, ErrorCodes.INVALID_INPUT), 400);
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
      return errorResponse(toSafeError(new Error('Domain not configured'), ErrorCodes.DOMAIN_NOT_CONFIGURED), 500);
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
      console.error('❌ NAMESTONE API ERROR', response.status, errorText);
      
      if (response.status === 401) {
        return errorResponse(toSafeError(new Error('Unauthorized'), ErrorCodes.UNAUTHORIZED), 401);
      }
      
      return errorResponse(toSafeError(new Error(`Namestone error: ${response.status}`), ErrorCodes.EXTERNAL_API_ERROR), 500);
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
    return errorResponse(toSafeError(error, ErrorCodes.INTERNAL_ERROR), 500);
  }
});
