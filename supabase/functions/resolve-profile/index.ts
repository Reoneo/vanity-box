import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileResult {
  ok: boolean;
  source: "web3bio" | "namestone" | "hl" | "fallback";
  profile: {
    address: string | null;
    identity: string;
    platform: string;
    displayName: string | null;
    avatar: string | null;
    description: string | null;
    header: string | null;
    website: string | null;
    url: string | null;
    links: any;
    followerCount?: number | null;
    followingCount?: number | null;
    ensRecords?: any;
    hlDomain?: string;
    hlNfts?: any[];
    hlTokens?: any[];
    farcaster?: any;
    location?: string | null;
    email?: string | null;
  } | null;
  notFound?: boolean;
  error?: string;
  debug?: { tried: string[]; timingsMs?: Record<string, number> };
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 2, timeoutMs = 10000): Promise<Response | null> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      
      // Retry on 429 (rate limit) or 5xx errors
      if (response.status === 429 || response.status >= 500) {
        if (i < maxRetries) {
          const delay = Math.pow(2, i) * 500; // 500ms, 1s, 2s...
          console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms for ${url}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return response;
    } catch (err: any) {
      console.error(`Fetch attempt ${i + 1} failed for ${url}:`, err.message);
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return null;
    }
  }
  return null;
}

// Call Web3.bio API
async function fetchWeb3BioProfile(identity: string): Promise<any | null> {
  const apiKey = Deno.env.get("WEB3BIO_API_KEY");
  const url = `https://api.web3.bio/profile/${encodeURIComponent(identity)}`;
  
  console.log(`🔍 Fetching Web3.bio profile for: ${identity}`);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  
  const response = await fetchWithRetry(url, { headers }, 2, 12000);
  
  if (!response) {
    console.log("❌ Web3.bio: All retries failed");
    return null;
  }
  
  if (response.status === 404) {
    console.log("⚠️ Web3.bio: Profile not found (404)");
    return { notFound: true };
  }
  
  if (!response.ok) {
    console.log(`❌ Web3.bio: HTTP ${response.status}`);
    return null;
  }
  
  const data = await response.json();
  
  // Web3.bio returns an array of profiles
  if (Array.isArray(data) && data.length > 0) {
    // Pick the primary profile (ENS > Farcaster > others)
    const platformPriority = ["ens", "farcaster", "lens", "dotbit", "unstoppabledomains"];
    let primaryProfile = data[0];
    
    for (const platform of platformPriority) {
      const found = data.find((p: any) => p.platform === platform);
      if (found) {
        primaryProfile = found;
        break;
      }
    }
    
    // Normalize to our format
    return {
      address: primaryProfile.address,
      identity: primaryProfile.identity,
      platform: primaryProfile.platform,
      displayName: primaryProfile.displayName,
      avatar: primaryProfile.avatar,
      description: primaryProfile.description,
      header: primaryProfile.header,
      website: primaryProfile.links?.website?.link,
      url: primaryProfile.links?.website?.link,
      links: primaryProfile.links,
      location: primaryProfile.location,
      email: primaryProfile.email,
      farcaster: primaryProfile.links?.farcaster,
    };
  }
  
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }
  
  return { notFound: true };
}

// Call Namestone API via our edge function
async function fetchNamestoneProfile(subdomain: string, supabaseUrl: string, supabaseKey: string): Promise<any | null> {
  console.log(`🔍 Fetching Namestone profile for: ${subdomain}`);
  
  try {
    const response = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/get-ens-subdomain-profile`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ subdomain }),
      },
      10000
    );
    
    if (!response.ok) {
      console.log(`❌ Namestone: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error || !data.address) {
      console.log("⚠️ Namestone: Profile not found or error");
      return null;
    }
    
    console.log("✅ Namestone profile found:", data.identity || subdomain);
    return data;
  } catch (err: any) {
    console.error("❌ Namestone fetch error:", err.message);
    return null;
  }
}

// Call HLN (Hyperliquid Names) resolver
async function fetchHlProfile(domain: string, supabaseUrl: string, supabaseKey: string): Promise<any | null> {
  console.log(`🔍 Fetching .hl domain profile for: ${domain}`);
  
  try {
    const response = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/resolve-hl-domain`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ domain }),
      },
      10000
    );
    
    if (!response.ok) {
      console.log(`❌ HLN: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.notFound || !data.address) {
      console.log("⚠️ HLN: Domain not found");
      return null;
    }
    
    console.log("✅ HLN domain resolved:", data.domain);
    return {
      address: data.address,
      identity: data.domain,
      platform: "hyperliquid",
      displayName: data.domain,
      avatar: data.avatar || null,
      description: null,
      header: null,
      website: null,
      url: null,
      links: {},
      hlDomain: data.domain,
      hlNfts: data.nfts || [],
      hlTokens: data.tokens || [],
    };
  } catch (err: any) {
    console.error("❌ HLN fetch error:", err.message);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const debug: { tried: string[]; timingsMs: Record<string, number> } = { tried: [], timingsMs: {} };
  
  try {
    const { identity } = await req.json();
    
    if (!identity || typeof identity !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "identity is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const normalized = identity.trim().toLowerCase();
    console.log(`\n🚀 resolve-profile called for: ${normalized}`);
    
    // Get Supabase config for internal edge function calls
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    // Determine identity type
    const isWalletAddress = /^0x[a-fA-F0-9]{40}$/i.test(normalized);
    const isHlDomain = normalized.endsWith(".hl");
    
    // Web3.bio-compatible TLDs
    const web3BioTLDs = [".eth", ".box", ".world.id"];
    const isWeb3BioCompatible = web3BioTLDs.some(tld => normalized.endsWith(tld));
    
    // Namestone-only TLDs (not indexed by Web3.bio)
    const namestoneTLDs = [".world", ".cash", ".apt", ".ton", ".flirtad", ".mexipay", ".guavapay", ".termux", ".spyda", ".mith", ".30315", ".teamxrp"];
    const isNamestoneTLD = namestoneTLDs.some(tld => normalized.endsWith(tld)) && !normalized.endsWith(".world.id");
    
    // Check for subdomains (2+ dots)
    const dotCount = normalized.split('.').filter(Boolean).length - 1;
    const isSubdomain = dotCount >= 2;
    const isL2EnsSubdomain = isSubdomain && (normalized.endsWith(".eth") || normalized.endsWith(".world.id"));
    
    console.log(`📊 Identity analysis: wallet=${isWalletAddress}, hl=${isHlDomain}, web3bio=${isWeb3BioCompatible}, namestone=${isNamestoneTLD}, l2subdomain=${isL2EnsSubdomain}`);
    
    let result: ProfileResult = { ok: false, source: "fallback", profile: null };
    
    // Route 1: .hl domains
    if (isHlDomain) {
      debug.tried.push("hl");
      const hlStart = Date.now();
      const hlProfile = await fetchHlProfile(normalized, supabaseUrl, supabaseKey);
      debug.timingsMs.hl = Date.now() - hlStart;
      
      if (hlProfile) {
        // Optionally enrich with Web3.bio using the resolved address
        if (hlProfile.address) {
          debug.tried.push("web3bio");
          const w3Start = Date.now();
          const web3Profile = await fetchWeb3BioProfile(hlProfile.address);
          debug.timingsMs.web3bio = Date.now() - w3Start;
          
          if (web3Profile && !web3Profile.notFound) {
            // Merge, keeping HL-specific data
            result = {
              ok: true,
              source: "hl",
              profile: {
                ...web3Profile,
                hlDomain: hlProfile.hlDomain,
                hlNfts: hlProfile.hlNfts,
                hlTokens: hlProfile.hlTokens,
              },
            };
          } else {
            result = { ok: true, source: "hl", profile: hlProfile };
          }
        } else {
          result = { ok: true, source: "hl", profile: hlProfile };
        }
      } else {
        result = { ok: false, source: "hl", profile: null, notFound: true };
      }
    }
    // Route 2: Namestone TLDs (direct Namestone lookup)
    else if (isNamestoneTLD) {
      debug.tried.push("namestone");
      const nsStart = Date.now();
      const nsProfile = await fetchNamestoneProfile(normalized, supabaseUrl, supabaseKey);
      debug.timingsMs.namestone = Date.now() - nsStart;
      
      if (nsProfile) {
        result = {
          ok: true,
          source: "namestone",
          profile: {
            address: nsProfile.address,
            identity: nsProfile.identity || normalized,
            platform: nsProfile.platform || "namestone",
            displayName: nsProfile.displayName,
            avatar: nsProfile.avatar,
            description: nsProfile.description,
            header: nsProfile.header,
            website: nsProfile.website,
            url: nsProfile.url,
            links: nsProfile.links,
            ensRecords: nsProfile.ensRecords,
            location: nsProfile.location,
            email: nsProfile.email,
          },
        };
      } else {
        result = { ok: false, source: "namestone", profile: null, notFound: true };
      }
    }
    // Route 3: Web3.bio-compatible (.eth, .box, .world.id, wallet addresses)
    else if (isWeb3BioCompatible || isWalletAddress) {
      debug.tried.push("web3bio");
      const w3Start = Date.now();
      const web3Profile = await fetchWeb3BioProfile(normalized);
      debug.timingsMs.web3bio = Date.now() - w3Start;
      
      if (web3Profile && !web3Profile.notFound) {
        result = { ok: true, source: "web3bio", profile: web3Profile };
      } 
      // Fallback for L2 ENS subdomains to Namestone
      else if (isL2EnsSubdomain) {
        console.log("🔄 Web3.bio failed for L2 subdomain, trying Namestone fallback");
        debug.tried.push("namestone");
        const nsStart = Date.now();
        const nsProfile = await fetchNamestoneProfile(normalized, supabaseUrl, supabaseKey);
        debug.timingsMs.namestone = Date.now() - nsStart;
        
        if (nsProfile) {
          result = {
            ok: true,
            source: "namestone",
            profile: {
              address: nsProfile.address,
              identity: nsProfile.identity || normalized,
              platform: nsProfile.platform || "namestone",
              displayName: nsProfile.displayName,
              avatar: nsProfile.avatar,
              description: nsProfile.description,
              header: nsProfile.header,
              website: nsProfile.website,
              url: nsProfile.url,
              links: nsProfile.links,
              ensRecords: nsProfile.ensRecords,
              location: nsProfile.location,
              email: nsProfile.email,
            },
          };
        }
      }
      // Fallback for wallet addresses: create minimal profile
      else if (isWalletAddress) {
        console.log("🔄 Creating minimal wallet profile as fallback");
        result = {
          ok: true,
          source: "fallback",
          profile: {
            address: normalized,
            identity: normalized,
            platform: "ethereum",
            displayName: null,
            avatar: null,
            description: null,
            header: null,
            website: null,
            url: null,
            links: {},
          },
        };
      } else {
        result = { ok: false, source: "web3bio", profile: null, notFound: true };
      }
    }
    // Route 4: Unknown format - try Web3.bio as a catch-all
    else {
      debug.tried.push("web3bio");
      const w3Start = Date.now();
      const web3Profile = await fetchWeb3BioProfile(normalized);
      debug.timingsMs.web3bio = Date.now() - w3Start;
      
      if (web3Profile && !web3Profile.notFound) {
        result = { ok: true, source: "web3bio", profile: web3Profile };
      } else {
        result = { ok: false, source: "web3bio", profile: null, notFound: true };
      }
    }
    
    debug.timingsMs.total = Date.now() - startTime;
    result.debug = debug;
    
    console.log(`✅ resolve-profile completed in ${debug.timingsMs.total}ms. Source: ${result.source}, OK: ${result.ok}`);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ resolve-profile error:", err);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: err.message || "Internal error",
        debug: { tried: debug.tried, timingsMs: { ...debug.timingsMs, total: Date.now() - startTime } }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
