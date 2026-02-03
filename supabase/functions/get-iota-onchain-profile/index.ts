import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IOTA Mainnet endpoints - indexer is required for IOTA Names methods
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

// Resolve IOTA name to owner address using indexer
async function resolveNameToOwner(name: string): Promise<string | null> {
  try {
    const fullName = name.endsWith('.iota') ? name : `${name}.iota`;
    console.log(`Resolving name to owner: ${fullName}`);
    
    // Use indexer endpoint for IOTA Names methods
    const response = await fetch(IOTA_INDEXER_MAINNET, {
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
      console.error(`RPC request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.error(`RPC error: ${data.error.message}`);
      return null;
    }
    
    if (!data.result || !data.result.targetAddress) {
      console.log(`No owner found for name: ${fullName}`);
      return null;
    }
    
    console.log(`Resolved ${fullName} to owner: ${data.result.targetAddress}`);
    return data.result.targetAddress;
  } catch (error) {
    console.error("Error resolving name to owner:", error);
    return null;
  }
}

// Find the Name NFT object ID for a given name
async function findNameObjectId(
  ownerAddress: string, 
  fullName: string
): Promise<string | null> {
  try {
    console.log(`Finding Name NFT for ${fullName} owned by ${ownerAddress}`);
    
    // Get all owned objects with content
    const result = await iotaRpc("iota_getOwnedObjects", [
      ownerAddress,
      {
        filter: { MatchAll: [] },
        options: { showType: true, showContent: true }
      }
    ]);
    
    if (!result?.data || !Array.isArray(result.data)) {
      console.log("No owned objects found");
      return null;
    }
    
    console.log(`Found ${result.data.length} owned objects, searching for Name NFT...`);
    
    // Look for Name NFTs
    const normalizedTarget = fullName.toLowerCase().replace('.iota', '');
    
    for (const obj of result.data) {
      const type = obj.data?.type?.toLowerCase() || "";
      const content = obj.data?.content?.fields || {};
      
      // Check if this looks like a Name NFT
      if (!type.includes("name") && !type.includes("iota_names")) continue;
      
      // Log for debugging
      console.log(`Checking object: ${obj.data?.objectId}, type: ${type}`);
      
      // Check various possible field names
      const possibleFields = ["name", "full_name", "domain", "label", "domain_name"];
      for (const field of possibleFields) {
        const value = content[field];
        if (typeof value === "string") {
          const normalizedValue = value.toLowerCase();
          
          if (
            normalizedValue === normalizedTarget ||
            normalizedValue === fullName.toLowerCase() ||
            normalizedValue.includes(normalizedTarget)
          ) {
            console.log(`Found matching Name NFT: ${obj.data.objectId}`);
            return obj.data.objectId;
          }
        }
      }
    }
    
    console.log(`No matching Name NFT found for ${fullName}`);
    return null;
  } catch (error) {
    console.error("Error finding Name NFT:", error);
    return null;
  }
}

// Fetch profile from registry dynamic field
async function fetchProfileFromRegistry(
  registryId: string,
  nameObjectId: string
): Promise<ProfileData | null> {
  try {
    console.log(`Fetching profile for nameObjectId: ${nameObjectId} from registry: ${registryId}`);
    
    const result = await iotaRpc("iota_getDynamicFieldObject", [
      registryId,
      {
        type: "0x2::object::ID",
        value: nameObjectId
      }
    ]);
    
    if (!result?.content?.fields?.value) {
      console.log("No profile found for this name");
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
    
    console.log("Fetched profile:", profile);
    return profile;
  } catch (error) {
    console.error("Error fetching profile from registry:", error);
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
      console.log("Failed to parse request body:", parseError);
    }

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Getting onchain profile for: ${name}`);

    // Get registry ID from environment
    const registryId = Deno.env.get("VANITY_PROFILE_REGISTRY_ID") || "";
    
    if (!registryId) {
      console.log("Move contract not deployed yet - registry ID not configured");
      return new Response(
        JSON.stringify({ 
          success: true,
          profile: null,
          ownerAddress: null,
          nameObjectId: null,
          message: "Onchain profile contract not yet deployed",
          contractDeployed: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Resolve name to owner address
    const ownerAddress = await resolveNameToOwner(name);
    
    if (!ownerAddress) {
      return new Response(
        JSON.stringify({ 
          success: true,
          profile: null,
          ownerAddress: null,
          nameObjectId: null,
          message: "Could not resolve name to owner address"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Find the Name NFT object ID
    const nameObjectId = await findNameObjectId(ownerAddress, name);
    
    if (!nameObjectId) {
      return new Response(
        JSON.stringify({ 
          success: true,
          profile: null,
          ownerAddress,
          nameObjectId: null,
          message: "Could not locate the Name NFT object. Please confirm the name is owned by this wallet."
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
    console.error("Error getting onchain profile:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to get onchain profile",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
