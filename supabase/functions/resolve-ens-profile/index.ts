import { ENS } from 'https://esm.sh/@ensdomains/ensjs@4.0.3';
import { ethers } from 'https://esm.sh/ethers@5.7.2';

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

    // Initialize ENS with ethers provider
    const provider = new ethers.providers.JsonRpcProvider('https://rpc.ankr.com/eth');
    const ens = new ENS();
    await ens.setProvider(provider);

    let ensName: string | null = null;
    let resolvedAddress: string | null = null;
    let isQueryAddress = false;

    // Determine if query is an address or ENS name
    if (trimmedQuery.startsWith('0x') && trimmedQuery.length === 42) {
      console.log('resolve-ens-profile: Query is a wallet address');
      isQueryAddress = true;
      resolvedAddress = ethers.utils.getAddress(trimmedQuery); // Checksum address

      // Get primary ENS name for the address (reverse resolution)
      try {
        ensName = await provider.lookupAddress(resolvedAddress);
        console.log('resolve-ens-profile: Primary ENS name:', ensName);
      } catch (error) {
        console.log('resolve-ens-profile: No primary ENS name found:', error);
      }
    } else {
      console.log('resolve-ens-profile: Query is an ENS name');
      ensName = trimmedQuery;

      // Resolve ENS name to address
      try {
        resolvedAddress = await provider.resolveName(ensName);
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
        ensName = await provider.lookupAddress(resolvedAddress);
        console.log('resolve-ens-profile: Got primary ENS name:', ensName);
      } catch (error) {
        console.log('resolve-ens-profile: No primary ENS name available:', error);
      }
    }

    // Fetch full ENS profile using ENS.js
    let profile: any = null;
    let ensRecords: Record<string, string> = {};
    
    if (ensName) {
      try {
        console.log('resolve-ens-profile: Fetching full profile for:', ensName);
        profile = await ens.name(ensName).getProfile();
        console.log('resolve-ens-profile: Profile fetched:', profile);

        // Extract text records
        if (profile?.records?.texts) {
          profile.records.texts.forEach((record: any) => {
            if (record.key && record.value) {
              ensRecords[record.key] = record.value;
            }
          });
        }
      } catch (error) {
        console.log('resolve-ens-profile: Error fetching profile:', error);
      }
    }

    // Build response object compatible with existing UI
    const responseProfile = {
      identity: ensName || resolvedAddress,
      platform: 'ens',
      displayName: ensRecords.display || profile?.name || ensName || resolvedAddress,
      avatar: profile?.records?.avatar || ensRecords.avatar || null,
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
      rawProfile: profile, // Include full ENS.js profile for debugging
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
