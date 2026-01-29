import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log(`Resolving .iota name for address: ${address}`);

    // Validate address format
    if (!isValidIotaAddress(address)) {
      console.log(`Invalid IOTA address format: ${address}`);
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

    // Use direct JSON-RPC call to IOTA mainnet for reverse lookup
    // API Reference: https://docs.iota.org/iota-api-ref#iotax_iotanamesreverselookup
    const rpcUrl = "https://api.mainnet.iota.cafe";
    
    console.log(`Calling iotax_iotaNamesReverseLookup for address: ${address}`);
    
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
      console.error(`RPC request failed with status: ${rpcResponse.status}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          name: null, 
          address,
          error: `RPC request failed: ${rpcResponse.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rpcData = await rpcResponse.json();
    console.log("RPC response:", JSON.stringify(rpcData));

    // Check for RPC errors
    if (rpcData.error) {
      console.error("RPC error:", rpcData.error);
      return new Response(
        JSON.stringify({ 
          success: true, 
          name: null, 
          address,
          message: rpcData.error.message || "RPC lookup failed" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the default name from the result
    const iotaName = rpcData?.result;

    if (!iotaName || typeof iotaName !== "string" || iotaName.trim().length === 0) {
      console.log(`No .iota name found for address: ${address}`);
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

    console.log(`Successfully resolved address ${address} to name: ${fullName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        name: fullName, 
        address 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error resolving IOTA address:", error);
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
