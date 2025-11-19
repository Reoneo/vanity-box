import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, http } from "npm:viem@2.21.54";
import { mainnet } from "npm:viem@2.21.54/chains";
import { normalize } from "npm:viem@2.21.54/ens";

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

    console.log(`Fetching ENS profile for subdomain: ${subdomain}`);

    // Create viem public client for Ethereum mainnet
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    // Normalize the ENS name
    const normalizedName = normalize(subdomain);
    console.log(`Normalized name: ${normalizedName}`);

    // Fetch ENS address
    let ensAddress = null;
    try {
      ensAddress = await publicClient.getEnsAddress({ name: normalizedName });
      console.log(`ENS address: ${ensAddress}`);
    } catch (error) {
      console.log(`Could not resolve ENS address: ${error.message}`);
    }

    // Fetch ENS text records
    const textRecordKeys = [
      'avatar',
      'description',
      'display',
      'email',
      'url',
      'location',
      'notice',
      'keywords',
      'com.discord',
      'com.github',
      'com.reddit',
      'com.twitter',
      'org.telegram',
      'io.keybase',
      'header',
      'contenthash',
    ];

    const textRecords: Record<string, string | null> = {};
    
    // Fetch all text records in parallel
    const textRecordPromises = textRecordKeys.map(async (key) => {
      try {
        const value = await publicClient.getEnsText({
          name: normalizedName,
          key,
        });
        return { key, value };
      } catch (error) {
        console.log(`Could not fetch ${key}: ${error.message}`);
        return { key, value: null };
      }
    });

    const results = await Promise.all(textRecordPromises);
    results.forEach(({ key, value }) => {
      textRecords[key] = value;
    });

    console.log(`Fetched ENS text records:`, textRecords);

    // Also fetch Namestone records for additional data
    let namestoneRecords: any = null;
    try {
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

      if (namestoneResponse.ok) {
        namestoneRecords = await namestoneResponse.json();
        console.log(`Fetched Namestone records:`, namestoneRecords);
      }
    } catch (error) {
      console.log(`Could not fetch Namestone records: ${error.message}`);
    }

    // Build social links from both ENS and Namestone records
    const links: any = {};
    
    if (textRecords['com.twitter']) {
      links.twitter = { link: `https://twitter.com/${textRecords['com.twitter']}`, handle: textRecords['com.twitter'] };
    }
    if (textRecords['com.github']) {
      links.github = { link: `https://github.com/${textRecords['com.github']}`, handle: textRecords['com.github'] };
    }
    if (textRecords['com.discord']) {
      links.discord = { link: textRecords['com.discord'], handle: textRecords['com.discord'] };
    }
    if (textRecords['org.telegram']) {
      links.telegram = { link: `https://t.me/${textRecords['org.telegram']}`, handle: textRecords['org.telegram'] };
    }
    if (textRecords['url']) {
      links.website = { link: textRecords['url'] };
    }
    if (textRecords['email']) {
      links.email = { link: `mailto:${textRecords['email']}` };
    }

    // Merge with Namestone text records if available
    if (namestoneRecords?.textRecords && Array.isArray(namestoneRecords.textRecords)) {
      namestoneRecords.textRecords.forEach((record: any) => {
        const key = record.key.toLowerCase();
        if (key.includes('twitter') && !links.twitter) {
          const handle = record.value.replace(/^https?:\/\/(www\.)?twitter\.com\//, '').replace(/^@/, '');
          links.twitter = { link: `https://twitter.com/${handle}`, handle };
        } else if (key.includes('github') && !links.github) {
          const handle = record.value.replace(/^https?:\/\/(www\.)?github\.com\//, '');
          links.github = { link: `https://github.com/${handle}`, handle };
        } else if (key.includes('telegram') && !links.telegram) {
          const handle = record.value.replace(/^https?:\/\/(www\.)?t\.me\//, '').replace(/^@/, '');
          links.telegram = { link: `https://t.me/${handle}`, handle };
        } else if (key.includes('discord') && !links.discord) {
          links.discord = { link: record.value, handle: record.value };
        }
      });
    }

    // Build profile object in Web3.bio-compatible format
    const profile = {
      identity: subdomain,
      platform: 'ens',
      displayName: textRecords['display'] || textRecords['name'] || subdomain.split('.')[0],
      avatar: textRecords['avatar'] || null,
      header: textRecords['header'] || null,
      description: textRecords['description'] || null,
      email: textRecords['email'] || null,
      location: textRecords['location'] || null,
      address: ensAddress,
      links,
      contenthash: textRecords['contenthash'] || null,
      // Include raw ENS records for debugging
      ensRecords: textRecords,
      // Include Namestone records if available
      namestoneRecords: namestoneRecords || null,
    };

    console.log(`Built profile:`, profile);

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching ENS subdomain profile:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to fetch ENS subdomain profile'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
