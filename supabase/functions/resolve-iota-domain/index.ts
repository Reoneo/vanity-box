import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IOTA Names mainnet constants
const IOTA_NAMES_CONSTANTS = {
  packageIds: {
    adminAddress: '0x548474360f9769077ccf07ff6e65060eb448470eabc1ae42b9ed371ddbfc23d2',
    adminCap: '0x541b117cac18fb1c07a293db300acd12b05c01fa81232b37151b005ca7d4f755',
    auctionPackageId: '0x6f727ea576a00036657fff0ae3a6d7c8171b178bf35112d6b83b2a6272cc5f0d',
    auctionHouseObjectId: '0x2292ea885039babe8c320f19e0b7546ebdef2b2f6cf2be600bf994cdb51e0050',
    iotaNamesObjectId: '0x7cab491740d51e0d75b26bf9984e49ba2e32a2d0694cabcee605543ed13c7dec',
    packageId: '0x7fff6e95f385349bec98d17121ab2bfa3e134f2f0b1ccefc270313415f7835ea',
    paymentsPackageId: '0x6b1b01f4c72786a893191d5c6e73d3012f7529f86fdee3bc8c163323cee08441',
    publisherId: '0x42faed18f40323158fb9b0f38630800addc2e9eea696265756769fc1f0e08ceb',
    registryTableId: '0x2dfc6f6d46ba55217425643a59dc85fe4d8ed273a9f74077bd0ee280dbb4f590',
    reverseRegistryTableId: '0x3550bcacb793ef8b776264665e7c99fa3d897695ed664656aac693cf9cf9b76b',
    couponsPackageId: '0xa7e4e483d79c245470d5eb3c285a4503a78d90a69d36e35e0993012f5c6137ca',
    subnamesPackageId: '0xd06a5607cc762f2352eeeb8c86c7f962558a06c6023c1eec031a41651d898c87',
    tempSubnameProxyPackageId: '0x7f34c135e55e5b436b3feaad369eabfe5b6d14c0c57544fefb6921db047e8cbc',
    upgradeCap: '0x03ac547ee58c268a69b5663a1fdee0e8202206922968d2a387104730627d188e',
  }
};

// IOTA mainnet RPC endpoint
const IOTA_MAINNET_RPC = "https://api.mainnet.iota.cafe";

serve(async (req) => {
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

    // Import the SDK dynamically
    const { IotaNamesClient } = await import("npm:@iota/iota-names-sdk@latest");
    const { getFullnodeUrl, IotaClient } = await import("npm:@iota/iota-sdk@latest/client");

    // Initialize IOTA client
    const iotaClient = new IotaClient({ url: getFullnodeUrl("mainnet") });

    // Initialize IOTA Names client with mainnet constants
    const iotaNamesClient = new IotaNamesClient({
      client: iotaClient,
      packageIds: IOTA_NAMES_CONSTANTS.packageIds,
    });

    // Remove .iota suffix if present for lookup
    const domainName = domain.toLowerCase().endsWith(".iota") 
      ? domain.toLowerCase().slice(0, -5) 
      : domain.toLowerCase();

    console.log(`Looking up IOTA name: ${domainName}`);

    // Resolve the domain to get the name record
    let nameRecord;
    try {
      nameRecord = await iotaNamesClient.getNameRecord(domainName);
      console.log("Name record:", JSON.stringify(nameRecord, null, 2));
    } catch (lookupError: any) {
      console.error("Name lookup error:", lookupError.message);
      return new Response(
        JSON.stringify({ error: "Domain not found", notFound: true }),
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

    // Build the profile response
    const profile = {
      address: walletAddress,
      identity: `${domainName}.iota`,
      platform: "iota",
      displayName: `${domainName}.iota`,
      avatar: avatar,
      description: description,
      header: null,
      website: website,
      url: null,
      links: links,
      iotaDomain: `${domainName}.iota`,
      iotaNameRecord: nameRecord,
    };

    console.log(`Successfully resolved .iota domain: ${domain}`);

    return new Response(
      JSON.stringify(profile),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error resolving IOTA domain:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to resolve domain" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
