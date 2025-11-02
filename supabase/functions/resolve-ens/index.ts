// Deno serverless function to resolve ENS names using viem
import { createPublicClient, http } from 'npm:viem@2.37.5';
import { mainnet } from 'npm:viem@2.37.5/chains';
import { normalize } from 'npm:viem@2.37.5/ens';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();

    if (!name) {
      throw new Error('ENS name is required');
    }

    // Create a public client to interact with Ethereum
    const client = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    // Normalize the ENS name
    const ensName = normalize(name);

    // Resolve ENS name to address
    const address = await client.getEnsAddress({
      name: ensName,
    });

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'No address found for this ENS name' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // All standard ENS text record keys per ENSIP-5
    const textRecordKeys = [
      'display',
      'description',
      'email',
      'keywords',
      'location',
      'name',
      'notice',
      'phone',
      'url',
      'header',
      'com.twitter',
      'com.github',
      'com.discord',
      'com.reddit',
      'org.telegram',
      'io.keybase',
      'vnd.twitter',
      'vnd.github',
    ];

    // Fetch avatar and all text records in parallel
    const [avatar, contenthash, ...textValues] = await Promise.all([
      client.getEnsAvatar({ name: ensName }).catch(() => null),
      client.getEnsText({ name: ensName, key: 'contenthash' }).catch(() => null),
      ...textRecordKeys.map(key => 
        client.getEnsText({ name: ensName, key }).catch(() => null)
      ),
    ]);

    // Build records object with all non-null values
    const records: Record<string, string> = {};
    textRecordKeys.forEach((key, index) => {
      if (textValues[index]) {
        records[key] = textValues[index];
      }
    });

    // Return ENS profile data with all records
    const profile = {
      address,
      displayName: records.display || records.name || ensName,
      avatar: avatar || null,
      header: records.header || null,
      description: records.description || null,
      email: records.email || null,
      location: records.location || null,
      contenthash: contenthash || null,
      records, // All text records found
      links: {
        twitter: (records['com.twitter'] || records['vnd.twitter']) ? 
          `https://twitter.com/${records['com.twitter'] || records['vnd.twitter']}` : null,
        github: (records['com.github'] || records['vnd.github']) ? 
          `https://github.com/${records['com.github'] || records['vnd.github']}` : null,
        discord: records['com.discord'] || null,
        telegram: records['org.telegram'] || null,
        reddit: records['com.reddit'] ? 
          `https://reddit.com/u/${records['com.reddit']}` : null,
        keybase: records['io.keybase'] ? 
          `https://keybase.io/${records['io.keybase']}` : null,
        website: records.url || null,
      },
    };

    return new Response(
      JSON.stringify(profile),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error resolving ENS:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
