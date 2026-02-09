import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: { iotaName?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const iotaName = body.iotaName;
    if (!iotaName) {
      return new Response(
        JSON.stringify({ error: "iotaName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Verifying profile integrity for ${iotaName}...`);

    // 1. Fetch the notarization record from DB
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: record, error: dbError } = await supabase
      .from("profile_notarizations")
      .select("*")
      .eq("iota_name", iotaName)
      .maybeSingle();

    if (dbError) {
      console.error("❌ DB query error:", dbError);
      return new Response(
        JSON.stringify({ verified: false, error: "Database query failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!record) {
      return new Response(
        JSON.stringify({
          verified: false,
          reason: "no_notarization",
          message: `No notarization record found for ${iotaName}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch profile JSON from IPFS using the stored CID
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${record.ipfs_cid}`;
    console.log(`📥 Fetching profile from IPFS: ${ipfsUrl}`);

    let ipfsContent: string;
    try {
      const ipfsRes = await fetch(ipfsUrl, {
        headers: { Accept: "application/json" },
      });
      if (!ipfsRes.ok) {
        throw new Error(`IPFS fetch failed: ${ipfsRes.status}`);
      }
      ipfsContent = await ipfsRes.text();
    } catch (ipfsError: any) {
      console.error("❌ IPFS fetch error:", ipfsError);
      return new Response(
        JSON.stringify({
          verified: false,
          reason: "ipfs_unavailable",
          message: "Could not fetch profile from IPFS",
          ipfsCid: record.ipfs_cid,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Compute SHA-256 of the IPFS content
    const encoder = new TextEncoder();
    const data = encoder.encode(ipfsContent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    console.log(`🔒 Stored hash:   ${record.sha256_hash}`);
    console.log(`🔒 Computed hash: ${computedHash}`);

    // 4. Compare hashes
    const hashMatch = computedHash === record.sha256_hash;

    // 5. Parse the IPFS content for display
    let profileData: any = null;
    try {
      profileData = JSON.parse(ipfsContent);
    } catch {
      // Content is valid but not JSON - still report hash match
    }

    const result = {
      verified: hashMatch,
      reason: hashMatch ? "match" : "hash_mismatch",
      message: hashMatch
        ? `Profile for ${iotaName} is verified and untampered`
        : `WARNING: Profile content does not match the notarized hash`,
      ipfsCid: record.ipfs_cid,
      sha256Hash: record.sha256_hash,
      computedHash,
      notarizedAt: record.notarized_at,
      walletAddress: record.wallet_address,
      gatewayUrl: ipfsUrl,
      profile: hashMatch ? profileData : null,
      version: record.version,
    };

    console.log(`${hashMatch ? "✅" : "❌"} Verification result: ${result.message}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Verification error:", error);
    return new Response(
      JSON.stringify({ verified: false, error: error.message || "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
