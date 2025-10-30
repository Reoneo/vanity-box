import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, http, namehash } from 'npm:viem';
import { worldchain } from 'npm:viem/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NAMESTONE_API_KEY = Deno.env.get('NAMESTONE_API_KEY');

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    console.log('Fetching domains for wallet:', walletAddress);

    if (!NAMESTONE_API_KEY) {
      throw new Error('NAMESTONE_API_KEY is not configured');
    }

    if (!walletAddress) {
      throw new Error('Missing wallet address');
    }

    // Fetch domains from Namestone API
    console.log('Calling Namestone get-names API');
    const namestoneResponse = await fetch('https://namestone.xyz/api/public_v1/get-names', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY!,
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
    console.log('Namestone response type:', typeof namestoneData);
    console.log('Is array:', Array.isArray(namestoneData));

    // Handle both response formats: direct array or {names: [...]}
    const namesArray = Array.isArray(namestoneData) ? namestoneData : (namestoneData.names || []);
    console.log('Names array:', namesArray);
    
    // Filter for smith.cash domains
    const smithDomains = namesArray.filter((name: any) => 
      name.domain === 'smith.cash'
    );

    console.log('Found smith.cash domains:', smithDomains.length);
    console.log('Smith domains:', smithDomains);

    // Check wrapped status for each domain
    const domainsWithWrappedStatus = await Promise.all(
      smithDomains.map(async (domain: any) => {
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
          const registrationYears = metadata.registration_years || 1;
          const expiryDate = metadata.expiry_date;

          return {
            ...domain,
            isWrapped,
            registration_years: registrationYears,
            expiry_date: expiryDate,
          };
        } catch (error) {
          console.error(`Error checking wrapped status for ${domain.name}:`, error);
          // If we can't check, assume not wrapped
          const metadata = domain.metadata || {};
          const registrationYears = metadata.registration_years || 1;
          const expiryDate = metadata.expiry_date;

          return {
            ...domain,
            isWrapped: false,
            registration_years: registrationYears,
            expiry_date: expiryDate,
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
