import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// IOTA Mainnet endpoints - use official indexer for IOTA Names methods
// The indexer endpoint is the primary source for IOTA Names resolution
const IOTA_MAINNET_INDEXER = "https://indexer.mainnet.iota.cafe";
const IOTA_MAINNET_RPC = "https://api.mainnet.iota.cafe";

interface IotaNameRecord {
  targetAddress: string | null;
  nftId: string;
  expirationTimestampMs: number;
  data: boolean;
}

interface IotaRpcResponse {
  jsonrpc: string;
  id: number;
  result?: IotaNameRecord | null;
  error?: {
    code: number;
    message: string;
  };
}

async function resolveIotaName(name: string): Promise<{ address: string | null; nftId: string | null }> {
  console.log(`🔍 Resolving IOTA name via JSON-RPC: ${name}`);
  
  // Use indexer as primary (IOTA Names methods are served by the indexer)
  const endpoints = [IOTA_MAINNET_INDEXER, IOTA_MAINNET_RPC];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Trying endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "iotax_iotaNamesLookup",
          params: [name],
        }),
      });

      if (!response.ok) {
        console.error(`❌ RPC request failed with status: ${response.status}`);
        continue;
      }

      const data: IotaRpcResponse = await response.json();
      
      if (data.error) {
        console.error(`❌ RPC error from ${endpoint}: ${data.error.message}`);
        continue;
      }

      if (data.result) {
        const address = data.result.targetAddress || null;
        const nftId = data.result.nftId || null;
        
        console.log(`✅ Resolved ${name}:`, {
          targetAddress: address,
          nftId: nftId,
          expirationTimestampMs: data.result.expirationTimestampMs,
        });
        
        return { address, nftId };
      }

      console.log(`⚠️ No result found for: ${name}`);
      return { address: null, nftId: null };
    } catch (error) {
      console.error(`❌ Network error with ${endpoint}:`, error);
      continue;
    }
  }
  
  console.log(`❌ Failed to resolve ${name} using all endpoints`);
  return { address: null, nftId: null };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: "Domain parameter required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📨 resolve-iota-domain request for: ${domain}`);

    // Ensure the domain has .iota suffix
    const fullName = domain.toLowerCase().endsWith(".iota")
      ? domain.toLowerCase()
      : `${domain.toLowerCase()}.iota`;

    // Resolve using IOTA Mainnet JSON-RPC (iotax_iotaNamesLookup)
    const { address: walletAddress, nftId } = await resolveIotaName(fullName);

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ 
          error: "Domain not found",
          notFound: true,
          domain: fullName,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the profile response matching existing format
    const profile = {
      address: walletAddress,
      identity: fullName,
      platform: "iota",
      displayName: fullName,
      avatar: null,
      description: null,
      header: null,
      website: null,
      url: null,
      links: {},
      iotaDomain: fullName,
      nftId: nftId, // Include the NFT ID for profile editing
    };

    console.log(`✅ Successfully resolved .iota domain: ${domain} -> ${walletAddress}`);

    return new Response(
      JSON.stringify(profile),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in resolve-iota-domain:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to resolve domain" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
