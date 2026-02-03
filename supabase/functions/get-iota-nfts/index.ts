// Edge function to fetch IOTA NFTs via Blockberry API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKBERRY_API_URL = "https://api.blockberry.one/iota";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "walletAddress is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("BLOCKBERRY_API_KEY");
    if (!apiKey) {
      console.error("BLOCKBERRY_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API not configured", nfts: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-iota-nfts] Fetching NFTs for ${walletAddress}`);

    // Fetch NFTs owned by wallet from Blockberry
    const url = `${BLOCKBERRY_API_URL}/v1/accounts/${walletAddress}/nfts?size=100&orderBy=DESC`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Blockberry NFTs API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, nfts: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const nftList = data?.content || data || [];
    
    console.log(`[get-iota-nfts] Found ${Array.isArray(nftList) ? nftList.length : 0} NFTs`);

    // Transform to standard NFT format
    const nfts = (Array.isArray(nftList) ? nftList : []).map((nft: any) => {
      return {
        identifier: nft.objectId || nft.id || nft.nftId,
        name: nft.name || nft.displayName || "Unknown NFT",
        description: nft.description || null,
        imageUrl: nft.imageUrl || nft.image || nft.displayImageUrl || null,
        collection: nft.collectionName || nft.collection || nft.projectName || "IOTA NFT",
        collectionId: nft.collectionId || nft.collectionObjectId || null,
        chain: "iota",
        objectType: nft.objectType || nft.type,
        rarity: nft.rarity || null,
        attributes: nft.attributes || nft.properties || [],
      };
    });

    // Group by collection for summary
    const collections: Record<string, number> = {};
    nfts.forEach((nft: any) => {
      const col = nft.collection || "Unknown";
      collections[col] = (collections[col] || 0) + 1;
    });

    return new Response(
      JSON.stringify({
        nfts,
        totalCount: nfts.length,
        collections,
        walletAddress,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[get-iota-nfts] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch NFTs", nfts: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
