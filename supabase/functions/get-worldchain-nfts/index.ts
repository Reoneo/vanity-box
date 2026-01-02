// Supabase Edge Function: get-worldchain-nfts
// Fetch NFTs for an owner on World Chain via Alchemy (server-side, avoids CORS + keeps API key secret)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AlchemyNftV3Response = {
  ownedNfts?: unknown[];
  pageKey?: string;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, pageSize } = await req.json().catch(() => ({}));

    if (!walletAddress || typeof walletAddress !== 'string') {
      return new Response(JSON.stringify({ error: 'walletAddress is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ALCHEMY_API_KEY');
    if (!apiKey) {
      console.error('[get-worldchain-nfts] Missing ALCHEMY_API_KEY secret');
      return new Response(JSON.stringify({ error: 'Server misconfiguration: missing Alchemy key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const size = typeof pageSize === 'number' && pageSize > 0 && pageSize <= 100 ? pageSize : 100;

    const url = new URL(`https://worldchain-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`);
    url.searchParams.set('owner', walletAddress);
    url.searchParams.set('withMetadata', 'true');
    url.searchParams.set('pageSize', String(size));

    console.log('[get-worldchain-nfts] Fetching:', url.toString().replace(apiKey, '[REDACTED]'));

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[get-worldchain-nfts] Alchemy error:', res.status, text);
      return new Response(JSON.stringify({ error: 'Alchemy request failed', status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = (await res.json()) as AlchemyNftV3Response;
    const ownedNfts = Array.isArray(data?.ownedNfts) ? data.ownedNfts : [];

    console.log('[get-worldchain-nfts] ownedNfts:', ownedNfts.length);

    return new Response(JSON.stringify({ ownedNfts, pageKey: data?.pageKey ?? null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[get-worldchain-nfts] Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
