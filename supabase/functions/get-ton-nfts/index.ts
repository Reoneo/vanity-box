import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tonAddress } = await req.json();

    if (!tonAddress || typeof tonAddress !== 'string') {
      return new Response(
        JSON.stringify({ nfts: [], error: 'tonAddress is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const address = tonAddress.trim();

    // Use TonAPI v2 public endpoint to fetch NFTs owned by address
    const apiUrl = `https://tonapi.io/v2/accounts/${encodeURIComponent(address)}/nfts?limit=100&indirect_ownership=false`;

    const res = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[get-ton-nfts] TonAPI error ${res.status}:`, errText);
      return new Response(
        JSON.stringify({ nfts: [], error: `TonAPI returned ${res.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    const nftItems = data.nft_items || [];

    // Normalize NFTs into a standard format
    const nfts = nftItems.map((item: any) => {
      const metadata = item.metadata || {};
      const collection = item.collection || {};
      const preview = item.previews?.find((p: any) => p.resolution === '500x500') ||
                      item.previews?.find((p: any) => p.resolution === '100x100') ||
                      item.previews?.[0];

      return {
        name: metadata.name || item.dns || 'TON NFT',
        description: metadata.description || '',
        image_url: preview?.url || metadata.image || '',
        collection: collection.name || 'TON Collection',
        collection_image: collection.previews?.[0]?.url || '',
        identifier: item.address,
        contract: collection.address || '',
        chain: 'ton',
        attributes: metadata.attributes || [],
        marketplace_url: item.address ? `https://getgems.io/nft/${item.address}` : null,
        verified: item.approved_by?.length > 0 || false,
      };
    });

    console.log(`[get-ton-nfts] Found ${nfts.length} NFTs for ${address}`);

    return new Response(
      JSON.stringify({ nfts, total: nfts.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error fetching TON NFTs:', error);
    return new Response(
      JSON.stringify({ nfts: [], error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
