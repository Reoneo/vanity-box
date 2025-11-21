import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (namestoneData?.textRecords && Array.isArray(namestoneData.textRecords)) {
      namestoneData.textRecords.forEach((record: any) => {
        if (record.key && record.value) {
          textRecords[record.key] = record.value;
        }
      });
    }

    console.log('Parsed text records:', textRecords);

    // Resolve ENS address if not available in text records or owner
    let resolvedAddress = textRecords['eth'] || namestoneData.owner || null;
    
    if (!resolvedAddress) {
      console.log('No address found in records, attempting ENS resolution for:', subdomain);
      try {
        // Use Cloudflare's public Ethereum RPC to resolve ENS name
        const rpcResponse = await fetch('https://cloudflare-eth.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // ENS Registry
              data: `0x3b3b57de${subdomain.split('.').reverse().map(label => {
                // Convert label to namehash format
                const hex = Array.from(label).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
                return hex.padEnd(64, '0');
              }).join('')}`
            }, 'latest'],
            id: 1
          })
        });

        if (rpcResponse.ok) {
          const rpcData = await rpcResponse.json();
          if (rpcData.result && rpcData.result !== '0x') {
            // Extract address from result (last 40 chars)
            const addressHex = '0x' + rpcData.result.slice(-40);
            if (addressHex !== '0x0000000000000000000000000000000000000000') {
              resolvedAddress = addressHex;
              console.log('✅ Resolved address from ENS:', resolvedAddress);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ ENS resolution failed:', error.message);
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
