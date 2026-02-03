import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// IOTA Mainnet RPC and Indexer endpoints
// The indexer endpoint is required for IOTA Names methods
const IOTA_MAINNET_RPC = "https://api.mainnet.iota.cafe";
const IOTA_MAINNET_INDEXER = "https://indexer.mainnet.iota.cafe";

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

async function resolveIotaName(name: string): Promise<string | null> {
  console.log(`🔍 Resolving IOTA name via JSON-RPC: ${name}`);
  
  // Try indexer first (IOTA Names methods are served by the indexer)
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

      if (data.result && data.result.targetAddress) {
        console.log(`✅ Resolved ${name} to: ${data.result.targetAddress} (via ${endpoint})`);
        return data.result.targetAddress;
      }

      console.log(`⚠️ No target address found for: ${name}`);
      return null;
    } catch (error) {
      console.error(`❌ Network error with ${endpoint}:`, error);
      continue;
    }
  }
  
  console.log(`❌ Failed to resolve ${name} using all endpoints`);
  return null;
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
    const walletAddress = await resolveIotaName(fullName);

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
