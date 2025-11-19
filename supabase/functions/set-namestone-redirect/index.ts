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

// Pin HTML to Web3.Storage and return CID (with retry logic)
async function pinToWeb3Storage(html: string, token: string, retries = 3): Promise<string> {
  if (!token) throw new Error("Missing Web3.Storage token");

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const files = new FormData();
      const blob = new Blob([html], { type: "text/html" });
      files.append("file", blob, "index.html");

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
      console.log(`✅ Web3.Storage upload successful on attempt ${attempt}`);
      return data.cid;
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Web3.Storage attempt ${attempt}/${retries} failed:`, error);
      
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Web3.Storage upload failed after retries");
}

// Pin HTML to Pinata IPFS
async function pinToPinata(html: string, jwt: string): Promise<string> {
  if (!jwt) throw new Error("Missing Pinata JWT");
  
  const formData = new FormData();
  const blob = new Blob([html], { type: "text/html" });
  formData.append("file", blob, "index.html");
  
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  console.log("✅ Pinata upload successful");
  return data.IpfsHash;
}

// Verify CID is accessible via multiple gateways (with timeout)
async function verifyCid(cid: string): Promise<{ success: boolean; urls: string[] }> {
  const gateways = [
    `https://cloudflare-ipfs.com/ipfs/${cid}/`,
    `https://ipfs.io/ipfs/${cid}/`,
    `https://${cid}.ipfs.dweb.link/`,
    `https://${cid}.ipfs.w3s.link/`,
  ];

  const results = await Promise.allSettled(
    gateways.map(async url => {
      try {
        // Add timeout for verification checks (5 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, { 
          method: "HEAD",
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✅ CID verified on gateway: ${url}`);
        }
        
        return { url, ok: response.ok };
      } catch (error) {
        console.warn(`Gateway check failed for ${url}:`, error);
        return { url, ok: false };
      }
    })
  );

  const accessibleUrls = results
    .filter(r => r.status === "fulfilled" && r.value.ok)
    .map(r => r.status === "fulfilled" ? r.value.url : "");

  if (accessibleUrls.length === 0) {
    console.warn(`⚠️ CID verification failed on all gateways`);
  }

  return {
    success: accessibleUrls.length > 0,
    urls: gateways,
  };
}

// Pin with automatic fallback and retry logic
async function pinRedirectHtml(html: string, web3StorageToken?: string, pinataJwt?: string): Promise<{ cid: string; provider: string }> {
  const errors: string[] = [];
  
  // Try Pinata first (most reliable)
  if (pinataJwt) {
    try {
      console.log("📌 Attempting Pinata upload...");
      const cid = await pinToPinata(html, pinataJwt);
      console.log(`✅ Pinned to Pinata: ${cid}`);
      return { cid, provider: "pinata" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Pinata: ${msg}`);
      console.warn("⚠️ Pinata failed, trying next provider...");
    }
  }
  
  // Try Web3.Storage as backup
  if (web3StorageToken) {
    try {
      console.log("📌 Attempting Web3.Storage upload with retry logic...");
      const cid = await pinToWeb3Storage(html, web3StorageToken, 3);
      console.log(`✅ Pinned to Web3.Storage: ${cid}`);
      return { cid, provider: "web3.storage" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Web3.Storage: ${msg}`);
      console.warn("⚠️ Web3.Storage failed");
    }
  }
  
  throw new Error(`All IPFS providers failed. ${errors.join(", ")}`);
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
      subname: rawSubname, 
      redirectType, // "default" or "custom"
      customUrl 
    } = await req.json();

    console.log("Set redirect request (raw):", { parentDomain, rawSubname, redirectType, customUrl });

    if (!parentDomain || rawSubname === undefined || rawSubname === null) {
      throw new Error("Missing required fields: parentDomain, subname");
    }

    // Normalize subname: strip parent domain if present, convert to lowercase
    let subname = rawSubname.toLowerCase().trim();
    const parentLower = parentDomain.toLowerCase();
    
    // If subname contains the parent domain, extract just the label
    if (subname.includes(`.${parentLower}`)) {
      subname = subname.replace(`.${parentLower}`, '');
      console.log(`⚠️ Stripped parent domain from subname: "${rawSubname}" → "${subname}"`);
    }
    
    // Empty string means root domain
    console.log("Normalized subname:", subname === "" ? "(root domain)" : subname);

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
    const pinataJwt = Deno.env.get("PINATA_JWT");
    
    if (!web3StorageToken && !pinataJwt) {
      throw new Error("No IPFS provider configured. Set PINATA_JWT or WEB3_STORAGE_TOKEN");
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
      .maybeSingle();

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

    // Pin to IPFS with automatic fallback
    const { cid, provider } = await pinRedirectHtml(html, web3StorageToken, pinataJwt);
    console.log(`Pinned to IPFS via ${provider}:`, cid);

    // Verify CID is accessible
    const verification = await verifyCid(cid);
    console.log("Gateway verification:", verification);

    // Set contenthash via Namestone
    const namestoneResult = await setContenthashViaNamestone({
      apiKey: namestoneApiKey,
      parentDomain,
      subname: subname || "",
      ipfsCid: cid,
      urlTextRecord: redirectUrl,
    });

    console.log("Namestone update successful:", namestoneResult);

    const ensName = fullName;
    const ethLimoUrl = `https://${ensName}.limo/`;

    return new Response(
      JSON.stringify({
        success: true,
        cid,
        provider,
        contenthash: `ipfs://${cid}`,
        url: redirectUrl,
        verificationUrls: verification.urls,
        ethLimoUrl,
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
