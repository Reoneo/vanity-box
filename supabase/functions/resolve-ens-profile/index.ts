import { ethers } from 'https://esm.sh/ethers@5.7.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multiple RPC endpoints for fallback
const RPC_ENDPOINTS = [
  'https://rpc.ankr.com/eth',
  'https://eth.llamarpc.com',
  'https://cloudflare-eth.com',
];

// ENS Public Resolver contract address
const ENS_PUBLIC_RESOLVER = '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41';

// Timeout wrapper for promises
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

// Create provider with fallback RPC endpoints
async function createProvider(): Promise<ethers.providers.StaticJsonRpcProvider> {
  console.log('resolve-ens-profile: Attempting to connect to Ethereum...');
  
  for (const rpc of RPC_ENDPOINTS) {
    try {
      console.log(`resolve-ens-profile: Trying RPC: ${rpc}`);
      const provider = new ethers.providers.StaticJsonRpcProvider(
        rpc,
        { chainId: 1, name: 'mainnet' }
      );
      
      // Test connection with timeout
      await withTimeout(provider.getBlockNumber(), 5000);
      console.log(`resolve-ens-profile: Connected successfully to ${rpc}`);
      return provider;
    } catch (error) {
      console.log(`resolve-ens-profile: Failed to connect to ${rpc}:`, error);
      continue;
    }
  }
  
  throw new Error('All RPC endpoints failed');
}

// Text record keys to fetch from ENS
const ENS_TEXT_KEYS = [
  'display',
  'description',
  'email',
  'location',
  'url',
  'avatar',
  'header',
  'com.twitter',
  'com.github',
  'com.discord',
  'org.telegram',
  'com.reddit',
  'com.spotify',
];

// Resolver ABI for text records
const RESOLVER_ABI = [
  'function text(bytes32 node, string key) view returns (string)',
];

Deno.serve(async (req) => {
  console.log('resolve-ens-profile: Function invoked');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('resolve-ens-profile: Query received:', query);

    if (!query || typeof query !== 'string') {
      console.error('resolve-ens-profile: Invalid query parameter');
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedQuery = query.trim().toLowerCase();
    console.log('resolve-ens-profile: Trimmed query:', trimmedQuery);

    // Initialize ethers provider for ENS with fallback
    const provider = await createProvider();

    let ensName: string | null = null;
    let resolvedAddress: string | null = null;
    let isQueryAddress = false;

    // Determine if query is an address or ENS name
    if (trimmedQuery.startsWith('0x') && trimmedQuery.length === 42) {
      console.log('resolve-ens-profile: Query is a wallet address');
      isQueryAddress = true;
      
      try {
        resolvedAddress = ethers.utils.getAddress(trimmedQuery); // Checksum address
        console.log('resolve-ens-profile: Checksummed address:', resolvedAddress);
      } catch (error) {
        console.error('resolve-ens-profile: Invalid address format:', error);
        return new Response(
          JSON.stringify({ data: null, notFound: true, message: 'Invalid address format' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get primary ENS name for the address (reverse resolution)
      try {
        ensName = await withTimeout(provider.lookupAddress(resolvedAddress), 10000);
        console.log('resolve-ens-profile: Primary ENS name:', ensName);
      } catch (error) {
        console.log('resolve-ens-profile: No primary ENS name found:', error);
      }
    } else {
      console.log('resolve-ens-profile: Query is an ENS name');
      ensName = trimmedQuery;

      // Resolve ENS name to address
      try {
        resolvedAddress = await withTimeout(provider.resolveName(ensName), 10000);
        console.log('resolve-ens-profile: Resolved address:', resolvedAddress);
      } catch (error) {
        console.error('resolve-ens-profile: Failed to resolve ENS name:', error);
      }
    }

    // If we couldn't resolve to an address, return not found
    if (!resolvedAddress) {
      console.log('resolve-ens-profile: No address resolved, returning not found');
      return new Response(
        JSON.stringify({ data: null, notFound: true, message: 'Profile not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we have an address but no ENS name, try to get primary name
    if (!ensName && resolvedAddress) {
      try {
        ensName = await withTimeout(provider.lookupAddress(resolvedAddress), 10000);
        console.log('resolve-ens-profile: Got primary ENS name:', ensName);
      } catch (error) {
        console.log('resolve-ens-profile: No primary ENS name available:', error);
      }
    }

    // Fetch ENS avatar using built-in ethers method
    let avatar: string | null = null;
    if (ensName) {
      try {
        const resolver = await withTimeout(provider.getResolver(ensName), 10000);
        if (resolver) {
          avatar = await withTimeout(resolver.getText('avatar'), 5000);
          console.log('resolve-ens-profile: Avatar:', avatar);
        }
      } catch (error) {
        console.log('resolve-ens-profile: No avatar found:', error);
      }
    }

    // Fetch ENS text records using resolver
    const ensRecords: Record<string, string> = {};
    if (ensName) {
      console.log('resolve-ens-profile: Fetching ENS text records for:', ensName);
      
      try {
        const resolver = await withTimeout(provider.getResolver(ensName), 10000);
        if (resolver) {
          // Fetch all text records
          await Promise.all(
            ENS_TEXT_KEYS.map(async (key) => {
              try {
                const value = await withTimeout(resolver.getText(key), 5000);
                if (value) {
                  ensRecords[key] = value;
                  console.log(`resolve-ens-profile: ${key}:`, value);
                }
              } catch (error) {
                // Silently skip missing records
              }
            })
          );
        }
      } catch (error) {
        console.log('resolve-ens-profile: Error fetching text records:', error);
      }
    }

    // Build response object compatible with existing UI
    const responseProfile = {
      identity: ensName || resolvedAddress,
      platform: 'ens',
      displayName: ensRecords.display || ensName || resolvedAddress,
      avatar: avatar || ensRecords.avatar || null,
      header: ensRecords.header || null,
      description: ensRecords.description || null,
      email: ensRecords.email || null,
      location: ensRecords.location || null,
      address: resolvedAddress,
      links: {
        twitter: ensRecords['com.twitter'] ? { link: `https://twitter.com/${ensRecords['com.twitter']}`, handle: ensRecords['com.twitter'] } : null,
        github: ensRecords['com.github'] ? { link: `https://github.com/${ensRecords['com.github']}`, handle: ensRecords['com.github'] } : null,
        discord: ensRecords['com.discord'] ? { link: ensRecords['com.discord'], handle: ensRecords['com.discord'] } : null,
        telegram: ensRecords['org.telegram'] ? { link: `https://t.me/${ensRecords['org.telegram']}`, handle: ensRecords['org.telegram'] } : null,
        reddit: ensRecords['com.reddit'] ? { link: `https://reddit.com/u/${ensRecords['com.reddit']}`, handle: ensRecords['com.reddit'] } : null,
        website: ensRecords.url ? { link: ensRecords.url, handle: ensRecords.url } : null,
      },
      ensRecords,
    };

    console.log('resolve-ens-profile: Response profile built successfully');

    return new Response(
      JSON.stringify(responseProfile),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('resolve-ens-profile: Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
