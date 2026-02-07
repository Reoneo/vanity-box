import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IOTA Mainnet endpoints - use official indexer for IOTA Names methods
const IOTA_RPC_MAINNET = "https://api.mainnet.iota.cafe";
const IOTA_INDEXER_MAINNET = "https://indexer.mainnet.iota.cafe";

// Environment variables (to be set after Move contract deployment)
// VANITY_PROFILE_REGISTRY_ID - The shared registry object ID
// IOTA_NAMES_NAME_NFT_TYPE - The full type path for Name NFTs

interface ProfileData {
  avatarUrl: string;
  headerUrl: string;
  bio: string;
  email: string;
  website: string;
  links: { platform: number; url: string }[];
}

// JSON-RPC helper
async function iotaRpc(method: string, params: unknown[]): Promise<any> {
  const response = await fetch(IOTA_RPC_MAINNET, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || "RPC call failed");
  }

  return data.result;
}

// Resolve IOTA name to owner address and NFT ID using indexer
async function resolveNameToOwnerAndNft(name: string): Promise<{ ownerAddress: string | null; nftId: string | null }> {
  try {
    const fullName = name.endsWith('.iota') ? name : `${name}.iota`;
    console.log(`🔍 Resolving name to owner and NFT ID: ${fullName}`);
    
    // Try indexer first, then RPC fallback
    const endpoints = [IOTA_INDEXER_MAINNET, IOTA_RPC_MAINNET];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "iotax_iotaNamesLookup",
            params: [fullName],
          }),
        });

        if (!response.ok) {
          console.error(`❌ RPC request to ${endpoint} failed: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.error) {
          console.error(`❌ RPC error from ${endpoint}: ${data.error.message}`);
          continue;
        }
        
        if (!data.result) {
          console.log(`⚠️ No result for name: ${fullName} from ${endpoint}`);
          return { ownerAddress: null, nftId: null };
        }
        
        const ownerAddress = data.result.targetAddress || null;
        const nftId = data.result.nftId || null;
        
        console.log(`✅ Resolved ${fullName}:`, { ownerAddress, nftId });
        return { ownerAddress, nftId };
        
      } catch (endpointError) {
        console.error(`❌ Network error with ${endpoint}:`, endpointError);
        continue;
      }
    }
    
    console.log(`❌ All endpoints failed for name: ${fullName}`);
    return { ownerAddress: null, nftId: null };
  } catch (error) {
    console.error("Error resolving name to owner:", error);
    return { ownerAddress: null, nftId: null };
  }
}

// Fetch profile from registry dynamic field
async function fetchProfileFromRegistry(
  registryId: string,
  nameObjectId: string
): Promise<ProfileData | null> {
  try {
    console.log(`📦 Fetching profile for nameObjectId: ${nameObjectId} from registry: ${registryId}`);
    
    const result = await iotaRpc("iota_getDynamicFieldObject", [
      registryId,
      {
        type: "0x2::object::ID",
        value: nameObjectId
      }
    ]);
    
    if (!result?.content?.fields?.value) {
      console.log("⚠️ No profile found for this name");
      return null;
    }
    
    const data = result.content.fields.value;
    
    // Parse profile data from Move struct format
    const profile: ProfileData = {
      avatarUrl: data.avatar_url || "",
      headerUrl: data.header_url || "",
      bio: data.bio || "",
      email: data.email || "",
      website: data.website || "",
      links: parseLinks(data.links || []),
    };
    
    console.log("✅ Fetched profile:", profile);
    return profile;
  } catch (error) {
    console.error("❌ Error fetching profile from registry:", error);
    return null;
  }
}

function parseLinks(linksData: any[]): { platform: number; url: string }[] {
  if (!Array.isArray(linksData)) return [];
  
  return linksData
    .map((link) => ({
      platform: link.platform as number,
      url: link.url || "",
    }))
    .filter((link) => link.url);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safely parse JSON body, handle empty requests
    let name: string | undefined;
    try {
      const body = await req.text();
      if (body && body.trim()) {
        const parsed = JSON.parse(body);
        name = parsed.name;
      }
    } catch (parseError) {
      console.log("⚠️ Failed to parse request body:", parseError);
    }

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📨 Getting onchain profile for: ${name}`);

    // Get registry ID from environment
    const registryId = Deno.env.get("VANITY_PROFILE_REGISTRY_ID") || "";
    
    // Step 1: Resolve name to owner address and NFT ID
    const { ownerAddress, nftId: nameObjectId } = await resolveNameToOwnerAndNft(name);
    
    if (!ownerAddress) {
      return new Response(
        JSON.stringify({ 
          success: false,
          profile: null,
          ownerAddress: null,
          nameObjectId: null,
          message: "Could not resolve name - domain may not exist or is not registered"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If contract not deployed yet, return what we have
    if (!registryId) {
      console.log("⚠️ Move contract not deployed yet - registry ID not configured");
      return new Response(
        JSON.stringify({ 
          success: true,
          profile: null,
          ownerAddress,
          nameObjectId,
          message: "Onchain profile contract not yet deployed",
          contractDeployed: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: If we don't have the NFT ID from lookup, we can still return the owner
    if (!nameObjectId) {
      return new Response(
        JSON.stringify({ 
          success: true,
          profile: null,
          ownerAddress,
          nameObjectId: null,
          message: "Name resolved but NFT ID not available"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Fetch profile from registry
    const profile = await fetchProfileFromRegistry(registryId, nameObjectId);

    return new Response(
      JSON.stringify({ 
        success: true,
        profile,
        ownerAddress,
        nameObjectId,
        contractDeployed: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error getting onchain profile:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to get onchain profile",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
