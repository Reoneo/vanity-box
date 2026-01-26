import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, iotaDomain } = await req.json();

    if (!walletAddress && !iotaDomain) {
      return new Response(
        JSON.stringify({ error: "walletAddress or iotaDomain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching IOTA portfolio for: ${iotaDomain || walletAddress}`);

    // Import IOTA SDK
    const { IotaClient, getNetwork, Network } = await import("npm:@iota/iota-sdk@^1.10.1/client");
    const { IotaNamesClient } = await import("npm:@iota/iota-names-sdk@^0.5.1");
    const { IotaGraphQLClient } = await import("npm:@iota/iota-sdk@^1.10.1/graphql");

    // Initialize IOTA clients
    const network = getNetwork(Network.Mainnet);
    const iotaClient = new IotaClient({ url: network.url });
    const iotaNamesClient = new IotaNamesClient({
      graphQlClient: new IotaGraphQLClient({ url: network.graphql! }),
      network: network.id,
    });

    let targetAddress = walletAddress;
    let domainData = null;

    // If iotaDomain is provided, resolve it to get the address
    if (iotaDomain) {
      try {
        const lookupName = iotaDomain.toLowerCase().endsWith(".iota") 
          ? iotaDomain.toLowerCase() 
          : `${iotaDomain.toLowerCase()}.iota`;
        
        console.log(`Resolving IOTA domain: ${lookupName}`);
        const nameRecord = await iotaNamesClient.getNameRecord(lookupName);
        
        if (nameRecord) {
          targetAddress = nameRecord.targetAddress || nameRecord.owner;
          domainData = {
            name: lookupName,
            owner: nameRecord.owner,
            targetAddress: nameRecord.targetAddress,
            data: nameRecord.data || {},
            expirationTimestampMs: nameRecord.expirationTimestampMs,
          };
          console.log(`Resolved ${lookupName} to ${targetAddress}`);
        }
      } catch (e) {
        console.error("Failed to resolve IOTA domain:", e);
      }
    }

    if (!targetAddress) {
      return new Response(
        JSON.stringify({ 
          error: "Could not resolve wallet address",
          tokens: [],
          nfts: [],
          totalValue: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch IOTA balance and coins
    const tokens: any[] = [];
    const nfts: any[] = [];
    let totalValue = 0;

    try {
      // Get all coins owned by the address
      const coins = await iotaClient.getAllCoins({ owner: targetAddress });
      console.log(`Found ${coins.data?.length || 0} coin types`);

      // Group coins by type
      const coinsByType: Record<string, bigint> = {};
      for (const coin of coins.data || []) {
        const coinType = coin.coinType;
        const balance = BigInt(coin.balance);
        coinsByType[coinType] = (coinsByType[coinType] || BigInt(0)) + balance;
      }

      // Process each coin type
      for (const [coinType, balance] of Object.entries(coinsByType)) {
        // Extract coin name from type (last part after ::)
        const parts = coinType.split("::");
        const symbol = parts[parts.length - 1] || "UNKNOWN";
        
        // Native IOTA token
        const isNativeIota = coinType === "0x2::iota::IOTA";
        const decimals = isNativeIota ? 9 : 9; // Default to 9 decimals
        const quantity = Number(balance) / Math.pow(10, decimals);

        tokens.push({
          symbol: isNativeIota ? "IOTA" : symbol,
          name: isNativeIota ? "IOTA" : symbol,
          quantity: quantity,
          decimals: decimals,
          coinType: coinType,
          icon: isNativeIota ? "https://assets.coingecko.com/coins/images/34421/standard/IOTA_Logo_icon_black_circle.png" : null,
          chain: "iota",
        });
      }

      console.log(`Processed ${tokens.length} token types`);
    } catch (e) {
      console.error("Error fetching IOTA coins:", e);
    }

    // Fetch NFTs (IOTA Names owned by the address)
    try {
      // Get names owned by this address
      const ownedNames = await iotaNamesClient.getNamesFromAddress(targetAddress);
      console.log(`Found ${ownedNames?.length || 0} IOTA Names`);

      for (const name of ownedNames || []) {
        nfts.push({
          identifier: name,
          name: name,
          collection: "IOTA Names",
          imageUrl: null, // IOTA Names don't have images by default
          chain: "iota",
          tokenType: "name",
        });
      }
    } catch (e) {
      console.error("Error fetching IOTA Names:", e);
    }

    // Fetch dynamic fields / owned objects for potential NFTs
    try {
      const ownedObjects = await iotaClient.getOwnedObjects({
        owner: targetAddress,
        options: { showType: true, showContent: true, showDisplay: true },
      });

      console.log(`Found ${ownedObjects.data?.length || 0} owned objects`);

      for (const obj of ownedObjects.data || []) {
        const display = obj.data?.display?.data;
        const objType = obj.data?.type || "";

        // Skip coins (already processed above)
        if (objType.includes("::coin::Coin<")) continue;

        // Check if it has display metadata (indicates it's an NFT)
        if (display && (display.name || display.image_url)) {
          nfts.push({
            identifier: obj.data?.objectId,
            name: display.name || "Unknown NFT",
            description: display.description || null,
            imageUrl: display.image_url || null,
            collection: display.project_name || "IOTA NFT",
            chain: "iota",
            objectType: objType,
          });
        }
      }

      console.log(`Total NFTs (including objects): ${nfts.length}`);
    } catch (e) {
      console.error("Error fetching owned objects:", e);
    }

    return new Response(
      JSON.stringify({
        tokens,
        nfts,
        totalValue,
        walletAddress: targetAddress,
        domain: domainData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in get-iota-portfolio:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to fetch IOTA portfolio",
        tokens: [],
        nfts: [],
        totalValue: 0,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
