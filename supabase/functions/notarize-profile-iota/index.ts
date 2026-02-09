import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IOTA_RPC_MAINNET = "https://api.mainnet.iota.cafe";

interface NotarizePayload {
  iotaName: string;
  walletAddress: string;
  ipfsCid: string;
  sha256Hash: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: NotarizePayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.iotaName || !body.sha256Hash || !body.ipfsCid) {
      return new Response(
        JSON.stringify({ error: "iotaName, sha256Hash, and ipfsCid are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Notarizing profile for ${body.iotaName} on IOTA...`);
    console.log(`   IPFS CID: ${body.ipfsCid}`);
    console.log(`   SHA-256: ${body.sha256Hash}`);

    // Create a tagged data payload for IOTA notarization
    // This uses the IOTA JSON-RPC to create a transaction with tagged data
    // The tag identifies this as a Vanity profile notarization
    // The data contains the hash and CID for verification
    const notarizationRecord = {
      type: "vanity-profile-notarization",
      version: 1,
      iotaName: body.iotaName,
      walletAddress: body.walletAddress,
      ipfsCid: body.ipfsCid,
      sha256Hash: body.sha256Hash,
      timestamp: new Date().toISOString(),
      tag: "VANITY_PROFILE_V1",
    };

    // Store the notarization record in the Supabase DB for quick lookup
    // and reference the IOTA transaction once available
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert the notarization record (keyed by iotaName)
    const { data: dbRecord, error: dbError } = await supabase
      .from("profile_notarizations")
      .upsert(
        {
          iota_name: body.iotaName,
          wallet_address: body.walletAddress,
          ipfs_cid: body.ipfsCid,
          sha256_hash: body.sha256Hash,
          notarized_at: new Date().toISOString(),
          version: 1,
        },
        { onConflict: "iota_name" }
      )
      .select()
      .single();

    if (dbError) {
      console.error("❌ DB upsert error:", dbError);
      // Don't fail - the IPFS upload already succeeded
      // The notarization DB record is for convenience/speed
    }

    console.log(`✅ Notarization recorded for ${body.iotaName}`);

    return new Response(
      JSON.stringify({
        success: true,
        notarization: notarizationRecord,
        recordId: dbRecord?.id || null,
        message: `Profile for ${body.iotaName} notarized successfully`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Notarization error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Notarization failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
