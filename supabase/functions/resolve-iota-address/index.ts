import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use official IOTA mainnet indexer for IOTA Names resolution
// The indexer is the authoritative source for IOTA Names methods
const IOTA_MAINNET_INDEXER = "https://indexer.mainnet.iota.cafe";
const IOTA_MAINNET_RPC = "https://api.mainnet.iota.cafe";

// Validate IOTA address format (64 hex chars with 0x prefix)
function isValidIotaAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/i.test(addr?.trim() || '');
}

// Resolve IOTA wallet address to .iota domain name (reverse lookup) using JSON-RPC
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Resolving .iota name for address: ${address}`);

    // Validate address format
    if (!isValidIotaAddress(address)) {
      console.log(`⚠️ Invalid IOTA address format: ${address}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          name: null, 
          address,
          message: "Invalid IOTA address format" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try endpoints in order: indexer first (primary for IOTA Names), then RPC fallback
    const endpoints = [IOTA_MAINNET_INDEXER, IOTA_MAINNET_RPC];
    let lastError: string | null = null;
    
    for (const rpcUrl of endpoints) {
      try {
        console.log(`📡 Calling iotax_iotaNamesReverseLookup at ${rpcUrl} for address: ${address}`);
        
        const rpcResponse = await fetch(rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "iotax_iotaNamesReverseLookup",
            params: [address.toLowerCase()],
          }),
        });

        if (!rpcResponse.ok) {
          console.error(`❌ RPC request to ${rpcUrl} failed with status: ${rpcResponse.status}`);
          lastError = `RPC request failed: ${rpcResponse.status}`;
          continue;
        }

        const rpcData = await rpcResponse.json();
        console.log(`📦 RPC response from ${rpcUrl}:`, JSON.stringify(rpcData));

        // Check for RPC errors
        if (rpcData.error) {
          console.error(`❌ RPC error from ${rpcUrl}:`, rpcData.error);
          lastError = rpcData.error.message || "RPC lookup failed";
          continue;
        }

        // Extract the default name from the result
        // The result is expected to be a string (the domain name) or null
        const iotaName = rpcData?.result;

        if (!iotaName || typeof iotaName !== "string" || iotaName.trim().length === 0) {
          console.log(`⚠️ No .iota name found for address: ${address} (via ${rpcUrl})`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              name: null, 
              address,
              message: "No .iota name found for this address" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Ensure the name ends with .iota
        const fullName = iotaName.endsWith('.iota') ? iotaName : `${iotaName}.iota`;

        console.log(`✅ Successfully resolved address ${address} to name: ${fullName}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            name: fullName, 
            address 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
      } catch (endpointError: any) {
        console.error(`❌ Network error with ${rpcUrl}:`, endpointError);
        lastError = endpointError.message || "Network error";
        continue;
      }
    }

    // All endpoints failed
    console.error(`❌ All endpoints failed for reverse lookup of address: ${address}`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        name: null, 
        address,
        error: lastError || "All endpoints failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error resolving IOTA address:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to resolve address", 
        stack: error.stack,
        success: false,
        name: null 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
