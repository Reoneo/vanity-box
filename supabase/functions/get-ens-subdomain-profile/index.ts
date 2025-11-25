import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, http } from 'npm:viem@2.x';
import { mainnet } from 'npm:viem@2.x/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain } = await req.json();
    
    if (!subdomain) {
      throw new Error('Subdomain is required');
    }

    console.log(`Fetching Namestone records for subdomain: ${subdomain}`);

    // Fetch Namestone records directly via the existing edge function
    const namestoneResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/get-namestone-records`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ subdomain }),
      }
    );

    if (!namestoneResponse.ok) {
      throw new Error(`Namestone API error: ${namestoneResponse.statusText}`);
    }

    const namestoneData = await namestoneResponse.json();
    console.log('Namestone data received:', namestoneData);

    // Parse Namestone text records into a usable format
    const textRecords: Record<string, string> = {};
    
    // Namestone returns textRecords as an object, not an array
    if (namestoneData?.textRecords && typeof namestoneData.textRecords === 'object') {
      // If it's already an object, use it directly
      if (!Array.isArray(namestoneData.textRecords)) {
        Object.entries(namestoneData.textRecords).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            textRecords[key] = String(value);
          }
        });
      } else {
        // If it's an array (old format), parse it
        namestoneData.textRecords.forEach((record: any) => {
          if (record.key && record.value) {
            textRecords[record.key] = record.value;
          }
        });
      }
    }

    console.log('Parsed text records:', textRecords);

    // Resolve ENS address - check eth.addr first (standard), then eth
    // Do NOT use namestoneData.owner - that's the NFT owner, not the manager
    let resolvedAddress = textRecords['eth.addr'] || textRecords['eth'] || null;
    
    if (!resolvedAddress) {
      console.log('No address found in records, attempting ENS resolution for:', subdomain);
      
      // Try multiple RPC endpoints in parallel with reduced timeout
      const rpcEndpoints = [
        'https://cloudflare-eth.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth'
      ];

      try {
        const clients = rpcEndpoints.map(url => 
          createPublicClient({
            chain: mainnet,
            transport: http(url),
          })
        );

        // Race all RPC endpoints with 1.5s timeout
        const ensAddress = await Promise.race([
          ...clients.map(client => client.getEnsAddress({ name: subdomain })),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 1.5s')), 1500)
          )
        ]);

        if (ensAddress && ensAddress !== '0x0000000000000000000000000000000000000000') {
          resolvedAddress = ensAddress;
          console.log('✅ Resolved from parallel RPC:', resolvedAddress);
        }
      } catch (error) {
        console.log('⚠️ All RPC endpoints failed:', error.message);
      }
      
      // If still no address and this is a subdomain, try parent domain
      if (!resolvedAddress && subdomain.split('.').length > 2) {
        try {
          const parentDomain = subdomain.split('.').slice(1).join('.');
          console.log('Attempting parent domain resolution:', parentDomain);
          
          const parentClient = createPublicClient({
            chain: mainnet,
            transport: http('https://eth.llamarpc.com'),
          });

          const parentAddress = await Promise.race([
            parentClient.getEnsAddress({ name: parentDomain }),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout after 1.5s')), 1500)
            )
          ]);
          
          if (parentAddress && parentAddress !== '0x0000000000000000000000000000000000000000') {
            resolvedAddress = parentAddress;
            console.log('✅ Using parent domain owner:', resolvedAddress);
          }
        } catch (error) {
          console.log('⚠️ Parent domain resolution failed:', error.message);
        }
      }
    }

    // Build social links from Namestone records
    const links: any = {};
    
    // Parse social media links
    if (textRecords['com.twitter'] || textRecords['twitter']) {
      const handle = (textRecords['com.twitter'] || textRecords['twitter'])
        .replace(/^https?:\/\/(www\.)?twitter\.com\//, '')
        .replace(/^@/, '');
      links.twitter = { link: `https://twitter.com/${handle}`, handle };
    }
    
    if (textRecords['com.github'] || textRecords['github']) {
      const handle = (textRecords['com.github'] || textRecords['github'])
        .replace(/^https?:\/\/(www\.)?github\.com\//, '');
      links.github = { link: `https://github.com/${handle}`, handle };
    }
    
    if (textRecords['com.discord'] || textRecords['discord']) {
      const value = textRecords['com.discord'] || textRecords['discord'];
      links.discord = { link: value, handle: value };
    }
    
    if (textRecords['org.telegram'] || textRecords['telegram']) {
      const handle = (textRecords['org.telegram'] || textRecords['telegram'])
        .replace(/^https?:\/\/(www\.)?t\.me\//, '')
        .replace(/^@/, '');
      links.telegram = { link: `https://t.me/${handle}`, handle };
    }
    
    if (textRecords['url'] || textRecords['website']) {
      links.website = { link: textRecords['url'] || textRecords['website'] };
    }
    
    if (textRecords['email']) {
      links.email = { link: `mailto:${textRecords['email']}` };
    }

    // Build profile object in Web3.bio-compatible format
    const profile = {
      identity: subdomain,
      platform: 'ens',
      displayName: textRecords['display'] || textRecords['name'] || subdomain,
      avatar: textRecords['avatar'] || null,
      header: textRecords['header'] || null,
      description: textRecords['description'] || null,
      email: textRecords['email'] || null,
      location: textRecords['location'] || null,
      address: resolvedAddress,
      links,
      contenthash: textRecords['contenthash'] || null,
      ensRecords: textRecords,
      namestoneRecords: namestoneData,
    };

    console.log('Built profile from Namestone:', profile);

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching ENS subdomain profile:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to fetch subdomain profile from Namestone'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
