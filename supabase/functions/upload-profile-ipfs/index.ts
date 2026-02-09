import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PINATA_API_URL = "https://api.pinata.cloud";

interface ProfilePayload {
  iotaName: string;
  walletAddress: string;
  avatarUrl: string;
  headerUrl: string;
  bio: string;
  email: string;
  website: string;
  links: { platform: number; url: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    if (!PINATA_JWT) {
      return new Response(
        JSON.stringify({ error: "PINATA_JWT not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: ProfilePayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.iotaName || !body.walletAddress) {
      return new Response(
        JSON.stringify({ error: "iotaName and walletAddress are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the profile JSON document
    const profileDoc = {
      version: 1,
      name: body.iotaName,
      owner: body.walletAddress,
      avatarUrl: body.avatarUrl || "",
      headerUrl: body.headerUrl || "",
      bio: body.bio || "",
      email: body.email || "",
      website: body.website || "",
      links: (body.links || []).filter((l: any) => l.url?.trim()),
      updatedAt: new Date().toISOString(),
    };

    console.log(`📤 Uploading profile for ${body.iotaName} to IPFS...`);

    // Pin JSON to IPFS via Pinata
    const pinRes = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: profileDoc,
        pinataMetadata: {
          name: `vanity-profile-${body.iotaName}`,
          keyvalues: {
            iotaName: body.iotaName,
            walletAddress: body.walletAddress,
            type: "vanity-profile",
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!pinRes.ok) {
      const errText = await pinRes.text();
      console.error(`❌ Pinata error: ${pinRes.status} ${errText}`);
      return new Response(
        JSON.stringify({ error: `IPFS upload failed: ${pinRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pinData = await pinRes.json();
    const ipfsCid = pinData.IpfsHash;

    console.log(`✅ Profile pinned to IPFS: ${ipfsCid}`);

    // Compute SHA-256 hash of the profile JSON (deterministic)
    const profileJsonString = JSON.stringify(profileDoc);
    const encoder = new TextEncoder();
    const data = encoder.encode(profileJsonString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    console.log(`🔒 SHA-256 hash: ${sha256Hash}`);

    return new Response(
      JSON.stringify({
        success: true,
        ipfsCid,
        sha256Hash,
        profileDoc,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsCid}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Upload failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
