import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resolve IOTA wallet address to .iota domain name (reverse lookup)
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

    // Import the SDK dynamically
    const { IotaNamesClient } = await import("npm:@iota/iota-names-sdk@^0.5.1");
    const { getNetwork, Network } = await import("npm:@iota/iota-sdk@^1.10.0/client");
    const { IotaGraphQLClient } = await import("npm:@iota/iota-sdk@^1.10.0/graphql");

    // Initialize IOTA Names client
    const network = getNetwork(Network.Mainnet);
    console.log(`Using IOTA network: ${network.id}, GraphQL URL: ${network.graphql}`);
    
    const iotaNamesClient = new IotaNamesClient({
      graphQlClient: new IotaGraphQLClient({ url: network.graphql! }),
      network: network.id,
    });

    // Do reverse lookup - find names owned by this address
    let iotaName = null;
    
    try {
      // The SDK should have a method to get names by owner
      // Try to use the default name for the address first
      const defaultName = await iotaNamesClient.getDefaultNameForAddress(address);
      console.log("Default name for address:", defaultName);
      
      if (defaultName) {
        iotaName = defaultName;
      }
    } catch (defaultError: any) {
      console.log("No default name, trying to get owned names:", defaultError.message);
      
      try {
        // Try to get all names owned by the address
        const ownedNames = await iotaNamesClient.getNamesForAddress(address);
        console.log("Owned names:", ownedNames);
        
        if (ownedNames && ownedNames.length > 0) {
          // Use the first owned name
          iotaName = ownedNames[0];
        }
      } catch (ownedError: any) {
        console.log("Could not get owned names:", ownedError.message);
      }
    }

    if (!iotaName) {
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
