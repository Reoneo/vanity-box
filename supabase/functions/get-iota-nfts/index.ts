// Edge function to fetch IOTA NFTs via native IOTA JSON-RPC API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use official IOTA mainnet RPC endpoint
const IOTA_RPC_URL = "https://api.mainnet.iota.cafe";

// Known IOTA Names registration type patterns
const IOTA_NAMES_REGISTRATION_TYPES = [
  "::registration::Registration",
  "::registration::NameRegistration",
  "::name_registration::NameRegistration",
  "::name_registration::Registration",
  "::subdomain_registration::SubdomainRegistration",
  "iota_names::registration",
  "iota_names::name_registration",
  "iota_names::subdomain",
  "::name_registration::",
];

// Helper to check if a type indicates an IOTA Names NFT
function isIotaNamesType(type: string): boolean {
  const normalizedType = type.toLowerCase();
  return IOTA_NAMES_REGISTRATION_TYPES.some(pattern => 
    normalizedType.includes(pattern.toLowerCase())
  );
}

// Helper to derive a collection name from NFT metadata
function deriveCollectionName(obj: any): string {
  const type = obj.data?.type || "";
  const display = obj.data?.display?.data || {};
  const content = obj.data?.content?.fields || {};
  const name = display.name || content.name || "";
  
  // 1. Check for IOTA Names registration NFTs (domains/subdomains)
  if (isIotaNamesType(type)) {
    return "IOTA Names";
  }
  
  // 2. Check if display data has a collection field (official standard)
  if (display.collection && typeof display.collection === "string") {
    return display.collection;
  }
  
  // 3. Check for common collection name patterns in content fields
  if (content.collection_name && typeof content.collection_name === "string") {
    return content.collection_name;
  }
  
  if (content.collection && typeof content.collection === "string") {
    return content.collection;
  }
  
  // 4. Check for known NFT collections by name patterns
  if (name) {
    const normalizedName = name.toLowerCase();
    
    // Genesis NFT collection
    if (normalizedName.startsWith("genesis nft") || normalizedName.includes("genesis #")) {
      return "Genesis NFT Collection";
    }
    
    // OG NFT patterns
    if (normalizedName.includes("og ") || normalizedName.startsWith("og#")) {
      return "OG Collection";
    }
    
    // Founders NFTs
    if (normalizedName.includes("founder") || normalizedName.startsWith("founders")) {
      return "Founders Collection";
    }
    
    // IOTA Rebased launch NFTs
    if (normalizedName.includes("rebased") || normalizedName.includes("launch")) {
      return "IOTA Rebased";
    }
  }
  
  // 5. Try to extract collection from the package/module name in the type
  // Type format: package_id::module_name::struct_name
  const typeMatch = type.match(/0x[a-f0-9]+::([a-z_]+)::/i);
  if (typeMatch && typeMatch[1]) {
    const moduleName = typeMatch[1];
    // Skip common generic module names
    if (!["coin", "nft", "object", "display", "balance", "token"].includes(moduleName.toLowerCase())) {
      // Convert snake_case to Title Case
      const formattedName = moduleName
        .split("_")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      return `${formattedName} Collection`;
    }
  }
  
  // 6. Default fallback
  return "IOTA NFT";
}

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
        // Include IOTA Names NFTs even without display
        if (isIotaNamesType(type)) return true;
        return false;
      })
      .map((obj: any) => {
        const display = obj.data?.display?.data || {};
        const content = obj.data?.content?.fields || {};
        const type = obj.data?.type || "";
        
        // Use the improved collection derivation logic
        const collection = deriveCollectionName(obj);
        
        // Extract domain name for IOTA Names
        let nftName = display.name || content.name || "Unknown NFT";
        if (collection === "IOTA Names") {
          // Try to get the actual domain name from content fields
          const rawDomain = content.domain_name || content.name || content.label;
          const domainName = typeof rawDomain === 'string' ? rawDomain : String(rawDomain || '');
          if (domainName && !domainName.endsWith('.iota')) {
            nftName = `${domainName}.iota`;
          } else if (domainName) {
            nftName = domainName;
          }
        }
        
        return {
          identifier: obj.data?.objectId,
          name: nftName,
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

    console.log(`[get-iota-nfts] Filtered to ${nfts.length} NFTs across ${Object.keys(collections).length} collections:`, collections);

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
