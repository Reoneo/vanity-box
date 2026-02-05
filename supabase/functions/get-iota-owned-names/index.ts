import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IOTA_MAINNET_INDEXER = "https://indexer.mainnet.iota.cafe";

interface OwnedNameItem {
  name: string;
  nftId: string;
  isSubname: boolean;
  targetAddress?: string;
  expirationTimestampMs?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ownerAddress } = await req.json();

    if (!ownerAddress) {
      return new Response(
        JSON.stringify({ success: false, error: "Owner address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching IOTA names for owner: ${ownerAddress}`);

    // Use the IOTA Indexer to find all registration NFTs owned by this address
    const rpcPayload = {
      jsonrpc: "2.0",
      id: 1,
      method: "iotax_iotaNamesFindAllRegistrationNFTs",
      params: [ownerAddress],
    };

    const response = await fetch(IOTA_MAINNET_INDEXER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rpcPayload),
    });

    if (!response.ok) {
      console.error("Indexer returned error:", response.status);
      return new Response(
        JSON.stringify({ success: false, error: `Indexer error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Indexer response:", JSON.stringify(data));

    if (data.error) {
      console.error("RPC Error:", data.error);
      return new Response(
        JSON.stringify({ success: false, error: data.error.message || "RPC error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The result contains arrays of names and subnames
    const result = data.result || {};
    const names: OwnedNameItem[] = [];

    // Process parent names (NameRegistration NFTs)
    if (Array.isArray(result.names)) {
      for (const item of result.names) {
        names.push({
          name: item.name || item.domainName || "unknown",
          nftId: item.nftId || item.objectId || item.id,
          isSubname: false,
          targetAddress: item.targetAddress || null,
          expirationTimestampMs: item.expirationTimestampMs,
        });
      }
    }

    // Process subnames (SubnameRegistration NFTs)
    if (Array.isArray(result.subnames)) {
      for (const item of result.subnames) {
        names.push({
          name: item.name || item.domainName || "unknown",
          nftId: item.nftId || item.objectId || item.id,
          isSubname: true,
          targetAddress: item.targetAddress || null,
          expirationTimestampMs: item.expirationTimestampMs,
        });
      }
    }

    // Also check if result itself is an array (alternative format)
    if (Array.isArray(result)) {
      for (const item of result) {
        const isSubname = item.isSubname || (item.name && item.name.split('.').length > 2);
        names.push({
          name: item.name || item.domainName || "unknown",
          nftId: item.nftId || item.objectId || item.id,
          isSubname,
          targetAddress: item.targetAddress || null,
          expirationTimestampMs: item.expirationTimestampMs,
        });
      }
    }

    console.log(`Found ${names.length} IOTA names for ${ownerAddress}`);

    return new Response(
      JSON.stringify({ success: true, names }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-iota-owned-names:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
