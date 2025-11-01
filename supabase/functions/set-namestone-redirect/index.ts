import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Redirect HTML builder
function buildRedirectHtml(opts: 
  | { mode: "EXACT"; exactUrl: string }
  | { mode: "PASSTHROUGH"; baseOrigin: string }
) {
  const EXACT = opts.mode === "EXACT" ? JSON.stringify(opts.exactUrl) : `""`;
  const BASE  = opts.mode === "PASSTHROUGH" ? JSON.stringify(opts.baseOrigin) : `""`;

  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redirecting…</title>
<script>
const EXACT_DEST=${EXACT};
const PASSTHROUGH_BASE=${BASE}.replace ? ${BASE}.replace(/\\/+$/,"") : "";
(function(){
  try{
    let target = EXACT_DEST && EXACT_DEST.trim();
    if(!target){
      var p = window.location.pathname || "/";
      var s = window.location.search || "";
      var h = window.location.hash || "";
      target = PASSTHROUGH_BASE + p + s + h;
    }
    window.location.replace(target);
    setTimeout(function(){ window.location.href = target; }, 50);
  }catch(e){}
})();
</script>
<noscript><meta http-equiv="refresh" content="0"><p>Redirecting…</p></noscript>`;
}

// Pin HTML to Web3.Storage and return CID
async function pinRedirectHtml(html: string, token: string): Promise<string> {
  if (!token) throw new Error("Missing Web3.Storage token");

  // Use Web3.Storage HTTP API directly
  const files = new FormData();
  const blob = new Blob([html], { type: "text/html" });
  files.append("file", blob, "redirect.html");

  const response = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: files,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Web3.Storage upload failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.cid;
}

// Set contenthash via Namestone API
async function setContenthashViaNamestone(params: {
  apiKey: string;
  parentDomain: string;
  subname: string;
  ipfsCid: string;
  urlTextRecord?: string;
}): Promise<any> {
  const { apiKey, parentDomain, subname, ipfsCid, urlTextRecord } = params;

  const payload: any = {
    name: subname,
    contenthash: `ipfs://${ipfsCid}`,
  };

  if (urlTextRecord) {
    payload.text_records = { 
      url: urlTextRecord, 
      redirect: urlTextRecord 
    };
  }

  const url = `https://namestone.com/api/public_v1/set-names`;
  console.log("Calling Namestone API:", { url, domain: parentDomain, payload });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      domain: parentDomain,
      names: [payload],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Namestone API error:", errorText);
    throw new Error(`Namestone ${res.status}: ${errorText}`);
  }

  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      parentDomain, 
      subname, 
      redirectType, // "default" or "custom"
      customUrl 
    } = await req.json();

    console.log("Set redirect request:", { parentDomain, subname, redirectType, customUrl });

    if (!parentDomain || !subname) {
      throw new Error("Missing required fields: parentDomain, subname");
    }

    if (!redirectType || !["default", "custom"].includes(redirectType)) {
      throw new Error("redirectType must be 'default' or 'custom'");
    }

    if (redirectType === "custom" && !customUrl) {
      throw new Error("customUrl is required for custom redirects");
    }

    // Validate custom URL if provided
    if (redirectType === "custom") {
      try {
        const u = new URL(customUrl);
        if (u.protocol !== "https:") {
          throw new Error("Custom URL must use HTTPS");
        }
      } catch (e) {
        throw new Error("Invalid HTTPS URL");
      }
    }

    // Get environment secrets
    const web3StorageToken = Deno.env.get("WEB3_STORAGE_TOKEN");
    if (!web3StorageToken) {
      throw new Error("WEB3_STORAGE_TOKEN not configured");
    }

    // Get Namestone API key - check domain-specific key first
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let namestoneApiKey = "";
    
    // Try to get domain-specific API key
    const { data: domainConfig } = await supabase
      .from("domain_configs")
      .select("api_key_secret_name")
      .eq("domain_name", parentDomain)
      .eq("status", "active")
      .single();

    if (domainConfig?.api_key_secret_name) {
      namestoneApiKey = Deno.env.get(domainConfig.api_key_secret_name) || "";
    }

    // Fallback to default key
    if (!namestoneApiKey) {
      namestoneApiKey = Deno.env.get("NAMESTONE_API_KEY") || "";
    }

    if (!namestoneApiKey) {
      throw new Error("Namestone API key not found");
    }

    // Determine redirect URL
    const fullName = subname ? `${subname}.${parentDomain}` : parentDomain;
    const redirectUrl = redirectType === "custom" 
      ? customUrl 
      : `https://vanity.box/${fullName}/`;

    console.log("Creating redirect to:", redirectUrl);

    // Build redirect HTML
    const html = buildRedirectHtml({ mode: "EXACT", exactUrl: redirectUrl });

    // Pin to IPFS
    const cid = await pinRedirectHtml(html, web3StorageToken);
    console.log("Pinned to IPFS:", cid);

    // Set contenthash via Namestone
    const namestoneResult = await setContenthashViaNamestone({
      apiKey: namestoneApiKey,
      parentDomain,
      subname: subname || "",
      ipfsCid: cid,
      urlTextRecord: redirectUrl,
    });

    console.log("Namestone update successful:", namestoneResult);

    return new Response(
      JSON.stringify({
        success: true,
        cid,
        contenthash: `ipfs://${cid}`,
        url: redirectUrl,
        namestoneResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error setting redirect:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to set redirect",
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
