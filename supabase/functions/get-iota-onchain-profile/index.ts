import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// IOTA Mainnet endpoints
const IOTA_INDEXER_MAINNET = "https://indexer.mainnet.iota.cafe";
const IOTA_RPC_MAINNET = "https://api.mainnet.iota.cafe";

// Resolve IOTA name to owner address and NFT ID using indexer
async function resolveNameToOwnerAndNft(name: string): Promise<{ ownerAddress: string | null; nftId: string | null }> {
  try {
    const fullName = name.endsWith('.iota') ? name : `${name}.iota`;
    console.log(`🔍 Resolving name: ${fullName}`);
    
    const endpoints = [IOTA_INDEXER_MAINNET, IOTA_RPC_MAINNET];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "iotax_iotaNamesLookup",
            params: [fullName],
          }),
        });

        if (!response.ok) continue;
        const data = await response.json();
        if (data.error || !data.result) continue;
        
        return {
          ownerAddress: data.result.targetAddress || null,
          nftId: data.result.nftId || null,
        };
      } catch {
        continue;
      }
    }
    
    return { ownerAddress: null, nftId: null };
  } catch {
    return { ownerAddress: null, nftId: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let name: string | undefined;
    try {
      const body = await req.text();
      if (body && body.trim()) {
        const parsed = JSON.parse(body);
        name = parsed.name;
      }
    } catch {
      // ignore parse error
    }

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📨 Getting profile for: ${name}`);

    // Step 1: Resolve name to owner address and NFT ID
    const { ownerAddress, nftId: nameObjectId } = await resolveNameToOwnerAndNft(name);
    
    if (!ownerAddress) {
      return new Response(
        JSON.stringify({ 
          success: false,
          profile: null,
          ownerAddress: null,
          nameObjectId: null,
          message: "Could not resolve name"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Fetch profile from IPFS via notarization record
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cleanName = name.endsWith('.iota') ? name : `${name}.iota`;
    const { data: record } = await supabase
      .from("profile_notarizations")
      .select("*")
      .eq("iota_name", cleanName)
      .maybeSingle();

    let profile = null;
    let ipfsCid = null;
    let verified = false;

    if (record?.ipfs_cid) {
      ipfsCid = record.ipfs_cid;
      try {
        const ipfsRes = await fetch(`https://gateway.pinata.cloud/ipfs/${record.ipfs_cid}`);
        if (ipfsRes.ok) {
          const ipfsContent = await ipfsRes.text();
          
          // Verify hash
          const encoder = new TextEncoder();
          const data = encoder.encode(ipfsContent);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const computedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
          verified = computedHash === record.sha256_hash;
          
          const parsed = JSON.parse(ipfsContent);
          profile = {
            avatarUrl: parsed.avatarUrl || "",
            headerUrl: parsed.headerUrl || "",
            bio: parsed.bio || "",
            email: parsed.email || "",
            website: parsed.website || "",
            links: parsed.links || [],
          };
          
          console.log(`✅ Profile loaded from IPFS, verified: ${verified}`);
        }
      } catch (e) {
        console.error("❌ IPFS fetch error:", e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        profile,
        ownerAddress,
        nameObjectId,
        ipfsCid,
        verified,
        notarizedAt: record?.notarized_at || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
