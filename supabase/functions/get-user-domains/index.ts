import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createPublicClient, http, namehash } from 'npm:viem';
import { worldchain } from 'npm:viem/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ENS Name Wrapper contract address (standard across networks)
const NAME_WRAPPER_ADDRESS = '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';

const NAME_WRAPPER_ABI = [
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Create viem client for World Chain
const viemClient = createPublicClient({
  chain: worldchain,
  transport: http(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    console.log('Fetching domains for wallet:', walletAddress);

    if (!walletAddress) {
      throw new Error('Missing wallet address');
    }

    // Get list of active domains from domain_configs
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: activeDomains, error: domainsError } = await supabase
      .from("domain_configs")
      .select("domain_name, api_key_secret_name")
      .eq("status", "active");

    if (domainsError) {
      console.error('Error fetching active domains:', domainsError);
      throw new Error(`Database error: ${domainsError.message}`);
    }

    console.log('Active domains:', activeDomains);

    // Fetch domains from Namestone API for the wallet
    console.log('Calling Namestone get-names API');
    
    // Use default API key for POST request (address-based query)
    const defaultApiKey = Deno.env.get('NAMESTONE_API_KEY');
    
    if (!defaultApiKey) {
      throw new Error('NAMESTONE_API_KEY is not configured');
    }

    const namestoneResponse = await fetch('https://namestone.com/api/public_v1/get-names', {
      method: 'POST',
      headers: {
        'Authorization': defaultApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: walletAddress,
        chain_id: 480, // World Chain network ID
      }),
    });

    if (!namestoneResponse.ok) {
      const errorText = await namestoneResponse.text();
      console.error('Namestone API error:', errorText);
      throw new Error(`Namestone API error: ${namestoneResponse.status} - ${errorText}`);
    }

    const namestoneData = await namestoneResponse.json();
    console.log('Namestone response:', namestoneData);

    // Handle both response formats: direct array or {names: [...]}
    const namesArray = Array.isArray(namestoneData) ? namestoneData : (namestoneData.names || []);
    console.log('Names array:', namesArray);
    
    // Filter for active domains only
    const activeDomainNames = new Set(activeDomains?.map(d => d.domain_name) || []);
    const userDomains = namesArray.filter((name: any) => 
      activeDomainNames.has(name.domain)
    );

    console.log('Found user domains across active domains:', userDomains.length);
    console.log('User domains:', userDomains);

    // Check wrapped status for each domain
    const domainsWithWrappedStatus = await Promise.all(
      userDomains.map(async (domain: any) => {
        try {
          const fullDomain = `${domain.name}.${domain.domain}`;
          const nameHash = namehash(fullDomain);
          
          console.log(`Checking wrapped status for ${fullDomain}, hash: ${nameHash}`);
          
          const owner = await viemClient.readContract({
            address: NAME_WRAPPER_ADDRESS,
            abi: NAME_WRAPPER_ABI,
            functionName: 'ownerOf',
            args: [nameHash as `0x${string}`],
          });

          const isWrapped = owner !== '0x0000000000000000000000000000000000000000';
          console.log(`Domain ${fullDomain} wrapped status: ${isWrapped}`);

          // Extract expiry and registration data from metadata if available
          const metadata = domain.metadata || {};
          const registrationMonths = metadata.registration_months || 12;
          const expiryDate = metadata.expiry_date;
          const gracePeriodEnd = metadata.grace_period_end;

          return {
            ...domain,
            isWrapped,
            registration_months: registrationMonths,
            expiry_date: expiryDate,
            grace_period_end: gracePeriodEnd,
          };
        } catch (error) {
          console.error(`Error checking wrapped status for ${domain.name}:`, error);
          // If we can't check, assume not wrapped
          const metadata = domain.metadata || {};
          const registrationMonths = metadata.registration_months || 12;
          const expiryDate = metadata.expiry_date;
          const gracePeriodEnd = metadata.grace_period_end;

          return {
            ...domain,
            isWrapped: false,
            registration_months: registrationMonths,
            expiry_date: expiryDate,
            grace_period_end: gracePeriodEnd,
          };
        }
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        domains: domainsWithWrappedStatus,
        totalCount: domainsWithWrappedStatus.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-user-domains function:', error);
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
