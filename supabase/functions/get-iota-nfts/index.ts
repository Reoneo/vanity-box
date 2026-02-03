// Edge function to fetch IOTA NFTs via native IOTA JSON-RPC API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IOTA_RPC_URL = "https://api.mainnet.iota.cafe";

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

    console.log(`[get-iota-nfts] Fetching NFTs for ${walletAddress}`);

    // Use IOTA native RPC to get owned objects (filter for NFT-like objects)
    const response = await fetch(IOTA_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "iotax_getOwnedObjects",
        params: [
          walletAddress,
          {
            options: {
              showType: true,
              showContent: true,
              showDisplay: true,
              showOwner: true,
            },
          },
          null, // cursor
          50,   // limit
        ],
      }),
    });

    if (!response.ok) {
      console.error("IOTA RPC error:", response.status);
      return new Response(
        JSON.stringify({ error: `RPC error: ${response.status}`, nfts: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    if (data.error) {
      console.error("IOTA RPC error:", data.error);
      return new Response(
        JSON.stringify({ error: data.error.message, nfts: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const objects = data.result?.data || [];
    console.log(`[get-iota-nfts] Found ${objects.length} owned objects`);

    // Filter for NFT-like objects (exclude coins and system objects)
    // NFTs typically have display metadata and are not coin types
    const nfts = objects
      .filter((obj: any) => {
        const type = obj.data?.type || "";
        const hasDisplay = obj.data?.display?.data;
        // Exclude coin types
        if (type.includes("::coin::Coin<") || type.includes("0x2::coin::")) return false;
        // Exclude staking objects
        if (type.includes("::staking_pool::") || type.includes("::timelocked_staking::")) return false;
        // Include objects with display metadata (NFTs typically have this)
        if (hasDisplay) return true;
        // Include IOTA Names NFTs
        if (type.includes("::registration::Registration") || type.includes("::subdomain_registration::")) return true;
        return false;
      })
      .map((obj: any) => {
        const display = obj.data?.display?.data || {};
        const content = obj.data?.content?.fields || {};
        const type = obj.data?.type || "";
        
        // Determine collection name from type
        let collection = "IOTA NFT";
        if (type.includes("::registration::Registration") || type.includes("iota_names")) {
          collection = "IOTA Names";
        }
        
        return {
          identifier: obj.data?.objectId,
          name: display.name || content.name || "Unknown NFT",
          description: display.description || content.description || null,
          imageUrl: display.image_url || display.img_url || content.image_url || content.url || null,
          collection: collection,
          collectionId: null,
          chain: "iota",
          objectType: type,
          rarity: null,
          attributes: [],
        };
      });

    // Group by collection for summary
    const collections: Record<string, number> = {};
    nfts.forEach((nft: any) => {
      const col = nft.collection || "Unknown";
      collections[col] = (collections[col] || 0) + 1;
    });

    console.log(`[get-iota-nfts] Filtered to ${nfts.length} NFTs`);

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
