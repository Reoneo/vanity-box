import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HLN REST API - Use the canonical production URL
const HLN_API_BASE = 'https://hlnames-rest-api.onrender.com/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HLN_API_KEY = Deno.env.get('HLN_API_KEY');
    if (!HLN_API_KEY) {
      console.error('HLN_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'HLN API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resolving .hl domain: ${domain}`);

    // Step 1: Resolve domain to wallet address
    const resolveUrl = `${HLN_API_BASE}/resolve/address/${encodeURIComponent(domain)}`;
    console.log(`Calling: ${resolveUrl}`);
    
    const resolveResponse = await fetch(resolveUrl, {
      headers: {
        'x-api-key': HLN_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!resolveResponse.ok) {
      const errorText = await resolveResponse.text();
      console.error(`Failed to resolve domain: ${resolveResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Domain not found', notFound: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resolveData = await resolveResponse.json();
    console.log('Resolve response:', JSON.stringify(resolveData));

    const walletAddress = resolveData.address || resolveData.result || resolveData;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      console.error('No wallet address in response:', resolveData);
      return new Response(
        JSON.stringify({ error: 'Could not resolve domain to address', notFound: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resolved to wallet: ${walletAddress}`);

    // Step 2: Get primary name for the wallet address
    let primaryName = domain;
    try {
      const primaryUrl = `${HLN_API_BASE}/resolve/primary_name/${walletAddress}`;
      console.log(`Fetching primary name: ${primaryUrl}`);
      
      const primaryResponse = await fetch(primaryUrl, {
        headers: {
          'x-api-key': HLN_API_KEY,
          'Accept': 'application/json',
        },
      });

      if (primaryResponse.ok) {
        const primaryData = await primaryResponse.json();
        console.log('Primary name response:', JSON.stringify(primaryData));
        primaryName = primaryData.name || primaryData.primary_name || primaryData || domain;
      }
    } catch (primaryError) {
      console.log('Primary name fetch error:', primaryError.message);
    }

    // Step 3: Get all names owned by wallet
    let ownedNames: string[] = [];
    try {
      const namesUrl = `${HLN_API_BASE}/utils/names_owner/${walletAddress}`;
      console.log(`Fetching owned names: ${namesUrl}`);
      
      const namesResponse = await fetch(namesUrl, {
        headers: {
          'x-api-key': HLN_API_KEY,
          'Accept': 'application/json',
        },
      });

      if (namesResponse.ok) {
        const namesData = await namesResponse.json();
        console.log('Owned names response:', JSON.stringify(namesData));
        ownedNames = namesData.names || namesData || [];
      }
    } catch (namesError) {
      console.log('Owned names fetch error:', namesError.message);
    }

    const result = {
      domain,
      address: walletAddress,
      primaryName: typeof primaryName === 'string' ? primaryName : domain,
      ownedNames: Array.isArray(ownedNames) ? ownedNames : [],
      avatar: null,
    };

    console.log(`Successfully resolved ${domain} to ${walletAddress}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in resolve-hl-domain:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});