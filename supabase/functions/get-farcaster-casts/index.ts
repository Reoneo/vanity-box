import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, fid, walletAddress, limit = 10, cursor } = await req.json();
    
    console.log('🎭 Farcaster casts request:', { username, fid, walletAddress, limit, cursor });
    
    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    
    if (!NEYNAR_API_KEY) {
      console.error('❌ NEYNAR_API_KEY not configured');
      throw new Error('NEYNAR_API_KEY not configured');
    }

    let userFid = fid;

    // If no username/fid but wallet address provided, lookup by address
    if (!username && !userFid && walletAddress) {
      console.log('🔍 Looking up FID for wallet:', walletAddress);
      
      const addressLookupUrl = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${walletAddress}`;
      
      const addressResponse = await fetch(addressLookupUrl, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      });

      if (addressResponse.ok) {
        const addressData = await addressResponse.json();
        // addressData format: { [address]: [{ fid, ... }] }
        const users = addressData[walletAddress.toLowerCase()];
        if (users && users.length > 0) {
          userFid = users[0].fid;
          console.log('✅ Found FID from address:', userFid);
        }
      }
    }

    // If username provided but no FID, lookup the FID first
    if (username && !userFid) {
      console.log('🔍 Looking up FID for username:', username);
      
      const lookupUrl = `https://api.neynar.com/v2/farcaster/user/by_username?username=${encodeURIComponent(username)}`;
      
      const lookupResponse = await fetch(lookupUrl, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      });

      if (!lookupResponse.ok) {
        const errorText = await lookupResponse.text();
        console.error('❌ Neynar lookup error:', lookupResponse.status, errorText);
        throw new Error(`Failed to lookup Farcaster user: ${lookupResponse.statusText}`);
      }

      const lookupData = await lookupResponse.json();
      userFid = lookupData.user?.fid;
      
      if (!userFid) {
        throw new Error('User not found on Farcaster');
      }
      
      console.log('✅ Found FID:', userFid);
    }

    if (!userFid) {
      throw new Error('Either username or fid is required');
    }

    // Fetch user's casts
    let castsUrl = `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${userFid}&limit=${limit}`;
    if (cursor) {
      castsUrl += `&cursor=${encodeURIComponent(cursor)}`;
    }
    
    console.log('📡 Fetching casts from:', castsUrl);
    
    const castsResponse = await fetch(castsUrl, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
      },
    });

    if (!castsResponse.ok) {
      const errorText = await castsResponse.text();
      console.error('❌ Neynar casts error:', castsResponse.status, errorText);
      throw new Error(`Failed to fetch casts: ${castsResponse.statusText}`);
    }

    const castsData = await castsResponse.json();
    console.log('✅ Fetched casts:', castsData.casts?.length || 0);

    return new Response(JSON.stringify({
      casts: castsData.casts || [],
      next: castsData.next || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error fetching Farcaster casts:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
