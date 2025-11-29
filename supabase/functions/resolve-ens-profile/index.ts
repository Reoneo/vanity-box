import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// The Graph ENS Subgraph endpoint
const ENS_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ]);
}

// Fetch ENS data from The Graph
async function fetchFromGraph(ensName: string): Promise<any> {
  const query = `
    query GetDomain($name: String!) {
      domains(where: { name: $name }) {
        name
        resolvedAddress {
          id
        }
        resolver {
          texts
          addr {
            id
          }
        }
        owner {
          id
        }
      }
    }
  `;

  console.log('🔍 Querying The Graph for:', ensName);
  
  const response = await withTimeout(
    fetch(ENS_SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query, 
        variables: { name: ensName } 
      })
    }),
    10000 // 10s timeout
  );

  if (!response.ok) {
    throw new Error(`The Graph API error: ${response.status}`);
  }

  const result = await response.json();
  console.log('📊 The Graph response:', JSON.stringify(result).substring(0, 300));
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

// Fetch profile from Web3.bio as fallback
async function fetchFromWeb3Bio(handle: string): Promise<any> {
  console.log('🌐 Fetching from Web3.bio:', handle);
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-web3bio-profile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ handle }),
    }
  );

  if (!response.ok) {
    throw new Error(`Web3.bio error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.notFound) {
    return null;
  }

  return data;
}

serve(async (req) => {
  console.log('resolve-ens-profile: Function invoked, version 4.0 (The Graph)');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('resolve-ens-profile: Query received:', query);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const trimmedQuery = query.trim().toLowerCase();
    console.log('resolve-ens-profile: Trimmed query:', trimmedQuery);

    let ensName: string = trimmedQuery;
    let resolvedAddress: string | null = null;
    let profile: any = null;

    // Determine if query is an address or ENS name
    const isAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedQuery);
    console.log('resolve-ens-profile: Query is', isAddress ? 'address' : 'ENS name');

    try {
    // Strategy 1: Try Web3.bio FIRST (has better ENS avatar + text records)
    console.log('🌐 Strategy 1: Trying Web3.bio (primary)...');
    
    try {
      const web3bioData = await fetchFromWeb3Bio(trimmedQuery);
      
      if (web3bioData && web3bioData.address) {
        console.log('✅ Web3.bio resolved profile with full data');
        profile = web3bioData;
        resolvedAddress = web3bioData.address;
      }
    } catch (web3bioError: any) {
      console.warn('⚠️ Web3.bio failed:', web3bioError.message);
    }

    // Strategy 2: Try The Graph as fallback (for basic address resolution)
    if (!profile || !resolvedAddress) {
      console.log('📊 Strategy 2: Trying The Graph ENS Subgraph fallback...');
      
      try {
        const graphData = await fetchFromGraph(ensName);
        
        if (graphData?.domains && graphData.domains.length > 0) {
          const domain = graphData.domains[0];
          resolvedAddress = domain.resolvedAddress?.id || domain.owner?.id || null;
          
          console.log('✅ The Graph resolved basic data:', { ensName, resolvedAddress });

          // Build minimal profile from The Graph data
          profile = {
            identity: ensName,
            platform: 'ens',
            displayName: ensName,
            address: resolvedAddress,
            avatar: null,
            description: null,
            links: {},
            ensRecords: {},
            source: 'the-graph'
          };
        } else {
          console.log('⚠️ No data from The Graph for:', ensName);
        }
      } catch (graphError: any) {
        console.warn('⚠️ The Graph fallback failed:', graphError.message);
      }
    }
  } catch (error: any) {
    console.error('❌ Profile resolution error:', error.message);
  }

    // If still no profile found, return not found
    if (!profile || !resolvedAddress) {
      console.log('❌ No profile found for:', trimmedQuery);
      return new Response(
        JSON.stringify({ 
          notFound: true,
          message: 'Profile not found',
          query: trimmedQuery
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return the resolved profile
    return new Response(
      JSON.stringify(profile),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ resolve-ens-profile error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to resolve ENS profile'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
