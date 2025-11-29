import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createPublicClient, http, isAddress, normalize } from 'https://esm.sh/viem@2.37.5';
import { mainnet } from 'https://esm.sh/viem@2.37.5/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Initialize viem public client for ENS resolution
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http('https://eth.llamarpc.com'),
    });

    let resolvedAddress: string | null = null;
    let ensName: string | null = null;
    let isQueryAddress = false;

    // Determine if query is an address or ENS name
    if (isAddress(trimmedQuery)) {
      console.log('resolve-ens-profile: Query is a wallet address');
      isQueryAddress = true;
      resolvedAddress = trimmedQuery;

      // Get primary ENS name for the address
      try {
        ensName = await publicClient.getEnsName({ address: trimmedQuery as `0x${string}` });
        console.log('resolve-ens-profile: Primary ENS name:', ensName);
      } catch (error) {
        console.log('resolve-ens-profile: No primary ENS name found:', error);
      }
    } else {
      console.log('resolve-ens-profile: Query is an ENS name');
      ensName = trimmedQuery;

      // Resolve ENS name to address
      try {
        resolvedAddress = await publicClient.getEnsAddress({ name: normalize(ensName) });
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
        ensName = await publicClient.getEnsName({ address: resolvedAddress as `0x${string}` });
        console.log('resolve-ens-profile: Got primary ENS name:', ensName);
      } catch (error) {
        console.log('resolve-ens-profile: No primary ENS name available:', error);
      }
    }

    // Fetch ENS avatar
    let avatar: string | null = null;
    if (ensName) {
      try {
        avatar = await publicClient.getEnsAvatar({ name: normalize(ensName) });
        console.log('resolve-ens-profile: Avatar:', avatar);
      } catch (error) {
        console.log('resolve-ens-profile: No avatar found:', error);
      }
    }

    // Fetch all ENS text records
    const ensRecords: Record<string, string> = {};
    if (ensName) {
      console.log('resolve-ens-profile: Fetching ENS text records for:', ensName);
      
      await Promise.all(
        ENS_TEXT_KEYS.map(async (key) => {
          try {
            const value = await publicClient.getEnsText({
              name: normalize(ensName!),
              key,
            });
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

    // Build profile object compatible with existing UI
    const profile = {
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

    console.log('resolve-ens-profile: Profile built successfully');

    return new Response(
      JSON.stringify(profile),
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
