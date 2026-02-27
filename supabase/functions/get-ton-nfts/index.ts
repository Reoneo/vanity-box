// Edge Function: Fetch TON NFTs for a wallet address via TonAPI
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TonNftPreview {
  resolution: string;
  url: string;
}

interface TonNftItem {
  address: string;
  index: number;
  owner?: { address: string };
  collection?: {
    address: string;
    name: string;
    description?: string;
  };
  verified?: boolean;
  metadata?: Record<string, unknown>;
  previews?: TonNftPreview[];
  trust?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json().catch(() => ({}));

    if (!walletAddress || typeof walletAddress !== 'string') {
      return new Response(JSON.stringify({ error: 'walletAddress is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TonAPI is free for basic usage, no API key required
    const url = `https://tonapi.io/v2/accounts/${encodeURIComponent(walletAddress)}/nfts?limit=100&indirect_ownership=false`;

    console.log('[get-ton-nfts] Fetching:', url.replace(walletAddress, walletAddress.slice(0, 10) + '...'));

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[get-ton-nfts] TonAPI error:', res.status, text);
      return new Response(JSON.stringify({ error: 'TonAPI request failed', status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const nftItems: TonNftItem[] = Array.isArray(data?.nft_items) ? data.nft_items : [];

    // Normalize to a consistent format for the frontend
    const nfts = nftItems.map((item) => {
      const metadata = (item.metadata || {}) as Record<string, string>;
      const previews = item.previews || [];

      // Pick best preview image
      const preview500 = previews.find((p) => p.resolution === '500x500');
      const preview100 = previews.find((p) => p.resolution === '100x100');
      const previewAny = previews[0];
      const imageUrl = preview500?.url || preview100?.url || previewAny?.url || metadata.image || '';

      const thumbnailUrl = preview100?.url || preview500?.url || previewAny?.url || metadata.image || '';

      return {
        address: item.address,
        index: item.index,
        name: metadata.name || `TON NFT #${item.index}`,
        description: metadata.description || '',
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        collection: item.collection?.name || 'Uncategorized',
        collection_address: item.collection?.address || '',
        verified: item.verified || false,
        trust: item.trust || 'unknown',
        attributes: metadata.attributes || [],
      };
    });

    console.log('[get-ton-nfts] Found', nfts.length, 'NFTs');

    return new Response(JSON.stringify({ nfts, total: nfts.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[get-ton-nfts] Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
