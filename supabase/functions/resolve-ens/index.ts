// Deno serverless function to resolve ENS names using viem
import { createPublicClient, http, normalize } from 'npm:viem@2.37.5';
import { mainnet } from 'npm:viem@2.37.5/chains';

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

    // Fetch ENS records
    const [avatar, description, email, twitter, github, url] = await Promise.all([
      client.getEnsAvatar({ name: ensName }).catch(() => null),
      client.getEnsText({ name: ensName, key: 'description' }).catch(() => null),
      client.getEnsText({ name: ensName, key: 'email' }).catch(() => null),
      client.getEnsText({ name: ensName, key: 'com.twitter' }).catch(() => null),
      client.getEnsText({ name: ensName, key: 'com.github' }).catch(() => null),
      client.getEnsText({ name: ensName, key: 'url' }).catch(() => null),
    ]);

    // Return ENS profile data
    const profile = {
      address,
      displayName: ensName,
      avatar: avatar || null,
      description: description || null,
      email: email || null,
      links: {
        twitter: twitter ? `https://twitter.com/${twitter}` : null,
        github: github ? `https://github.com/${github}` : null,
        website: url || null,
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
