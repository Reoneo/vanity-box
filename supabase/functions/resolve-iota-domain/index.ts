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
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: "Domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Resolving .iota domain: ${domain}`);

    // Import the SDK dynamically using GraphQL approach (per SDK documentation)
    const { IotaNamesClient } = await import("npm:@iota/iota-names-sdk@^0.5.1");
    const { getNetwork, Network } = await import("npm:@iota/iota-sdk@^1.10.1/client");
    const { IotaGraphQLClient } = await import("npm:@iota/iota-sdk@^1.10.1/graphql");

    // Initialize IOTA Names client using GraphQL approach (per SDK documentation)
    const network = getNetwork(Network.Mainnet);
    console.log(`Using IOTA network: ${network.id}, GraphQL URL: ${network.graphql}`);
    
    const iotaNamesClient = new IotaNamesClient({
      graphQlClient: new IotaGraphQLClient({ url: network.graphql! }),
      network: network.id,
    });

    // FIX: Keep the full domain name WITH .iota suffix (SDK expects it)
    const domainName = domain.toLowerCase();
    // Ensure it ends with .iota
    const lookupName = domainName.endsWith(".iota") ? domainName : `${domainName}.iota`;

    console.log(`Looking up IOTA name: ${lookupName}`);

    // Resolve the domain to get the name record
    let nameRecord;
    try {
      nameRecord = await iotaNamesClient.getNameRecord(lookupName);
      console.log("Name record:", JSON.stringify(nameRecord, null, 2));
    } catch (lookupError: any) {
      console.error("Name lookup error:", lookupError.message);
      return new Response(
        JSON.stringify({ error: "Domain not found", notFound: true, details: lookupError.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nameRecord) {
      return new Response(
        JSON.stringify({ error: "Domain not found", notFound: true }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract wallet address from name record
    const walletAddress = nameRecord.targetAddress || nameRecord.owner || null;
    console.log(`Resolved to wallet: ${walletAddress}`);

    // Try to get avatar and other metadata from content hash or data
    let avatar = null;
    let description = null;
    let website = null;
    let twitter = null;
    let github = null;
    let telegram = null;
    let discord = null;

    // Check if there are text records or metadata
    if (nameRecord.data) {
      const data = nameRecord.data;
      avatar = data.avatar || data.image || null;
      description = data.description || data.bio || null;
      website = data.url || data.website || null;
      twitter = data.twitter || data["com.twitter"] || null;
      github = data.github || data["com.github"] || null;
      telegram = data.telegram || data["org.telegram"] || null;
      discord = data.discord || data["com.discord"] || null;
    }

    // Convert IPFS URLs if needed
    if (avatar && avatar.startsWith("ipfs://")) {
      avatar = avatar.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    // Build links object
    const links: Record<string, any> = {};
    if (website) links.website = { link: website, handle: website };
    if (twitter) links.twitter = { link: `https://twitter.com/${twitter.replace("@", "")}`, handle: twitter };
    if (github) links.github = { link: `https://github.com/${github}`, handle: github };
    if (telegram) links.telegram = { link: `https://t.me/${telegram}`, handle: telegram };
    if (discord) links.discord = { link: discord, handle: discord };

    // Extract display name without .iota suffix
    const displayName = lookupName.replace(".iota", "");

    // Build the profile response
    const profile = {
      address: walletAddress,
      identity: lookupName,
      platform: "iota",
      displayName: lookupName,
      avatar: avatar,
      description: description,
      header: null,
      website: website,
      url: null,
      links: links,
      iotaDomain: lookupName,
      iotaNameRecord: nameRecord,
    };

    console.log(`Successfully resolved .iota domain: ${domain} -> ${walletAddress}`);

    return new Response(
      JSON.stringify(profile),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error resolving IOTA domain:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to resolve domain", stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
