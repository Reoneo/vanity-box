import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HLN_API_BASE = 'https://api.hlnames.xyz/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HLN_API_KEY = Deno.env.get('HLN_API_KEY');
    if (!HLN_API_KEY) {
      console.error('HLN_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'HLN API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resolving .hl domain: ${domain}`);

    // Step 1: Resolve domain to wallet address
    const resolveUrl = `${HLN_API_BASE}/resolve/address/${encodeURIComponent(domain)}`;
    console.log(`Calling: ${resolveUrl}`);
    
    const resolveResponse = await fetch(resolveUrl, {
      headers: {
        'Authorization': `Bearer ${HLN_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!resolveResponse.ok) {
      const errorText = await resolveResponse.text();
      console.error(`Failed to resolve domain: ${resolveResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Domain not found', notFound: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resolveData = await resolveResponse.json();
    console.log('Resolve response:', JSON.stringify(resolveData));

    const walletAddress = resolveData.address || resolveData.result || resolveData;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      console.error('No wallet address in response:', resolveData);
      return new Response(
        JSON.stringify({ error: 'Could not resolve domain to address', notFound: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resolved to wallet: ${walletAddress}`);

    // Step 2: Get profile data for the wallet address
    let profileData = null;
    try {
      const profileUrl = `${HLN_API_BASE}/resolve/profile/${walletAddress}`;
      console.log(`Fetching profile: ${profileUrl}`);
      
      const profileResponse = await fetch(profileUrl, {
        headers: {
          'Authorization': `Bearer ${HLN_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (profileResponse.ok) {
        profileData = await profileResponse.json();
        console.log('Profile response:', JSON.stringify(profileData));
      } else {
        console.log(`Profile fetch failed: ${profileResponse.status}`);
      }
    } catch (profileError) {
      console.log('Profile fetch error:', profileError.message);
    }

    // Step 3: Get NFTs for the wallet
    let nfts = [];
    try {
      const nftsUrl = `${HLN_API_BASE}/nfts/${walletAddress}`;
      console.log(`Fetching NFTs: ${nftsUrl}`);
      
      const nftsResponse = await fetch(nftsUrl, {
        headers: {
          'Authorization': `Bearer ${HLN_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (nftsResponse.ok) {
        const nftsData = await nftsResponse.json();
        nfts = nftsData.nfts || nftsData.items || nftsData || [];
        console.log(`Found ${Array.isArray(nfts) ? nfts.length : 0} NFTs`);
      }
    } catch (nftError) {
      console.log('NFT fetch error:', nftError.message);
    }

    // Step 4: Get tokens for the wallet
    let tokens = [];
    try {
      const tokensUrl = `${HLN_API_BASE}/tokens/${walletAddress}`;
      console.log(`Fetching tokens: ${tokensUrl}`);
      
      const tokensResponse = await fetch(tokensUrl, {
        headers: {
          'Authorization': `Bearer ${HLN_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json();
        tokens = tokensData.tokens || tokensData.items || tokensData || [];
        console.log(`Found ${Array.isArray(tokens) ? tokens.length : 0} tokens`);
      }
    } catch (tokenError) {
      console.log('Token fetch error:', tokenError.message);
    }

    const result = {
      domain,
      address: walletAddress,
      profile: profileData,
      primaryName: profileData?.primaryName || profileData?.name || domain,
      avatar: profileData?.avatar || profileData?.image || null,
      nfts: Array.isArray(nfts) ? nfts : [],
      tokens: Array.isArray(tokens) ? tokens : [],
    };

    console.log(`Successfully resolved ${domain} to ${walletAddress}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in resolve-hl-domain:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
