import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Basenames (.base.eth) are ENS subnames whose records may live on Base and
// are resolved via CCIP-read (EIP-3668). Web3.bio doesn't always index them,
// so we add an onchain fallback.
import { createPublicClient, http, getEnsAddress, getEnsAvatar, getEnsText } from "https://esm.sh/viem@2.23.2";
import { mainnet } from "https://esm.sh/viem@2.23.2/chains";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileResult {
  ok: boolean;
  source: "web3bio" | "namestone" | "hl" | "vet" | "basenames" | "fallback";
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
    vetDomain?: string;
    farcaster?: any;
    location?: string | null;
    email?: string | null;
  } | null;
  notFound?: boolean;
  error?: string;
  debug?: { tried: string[]; timingsMs?: Record<string, number> };
}

function isBasename(identity: string): boolean {
  return (identity || "").trim().toLowerCase().endsWith(".base.eth");
}

function ipfsToGateway(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ipns://")) return url.replace("ipns://", "https://ipfs.io/ipns/");
  return url;
}

async function resolveBasenameOnchain(name: string): Promise<ProfileResult["profile"] | null> {
  const rpcCandidates = [
    Deno.env.get("ETH_RPC_URL") || "",
    "https://cloudflare-eth.com",
    "https://rpc.ankr.com/eth",
  ].filter(Boolean);

  for (const rpcUrl of rpcCandidates) {
    try {
      const client = createPublicClient({
        chain: mainnet,
        transport: http(rpcUrl),
        ccipRead: true,
      });

      const address = await getEnsAddress(client, { name });
      if (!address) return null;

      let avatar: string | null = null;
      let description: string | null = null;
      let url: string | null = null;
      let email: string | null = null;

      try {
        avatar = await getEnsAvatar(client, { name });
      } catch (_) {
        avatar = null;
      }
      try {
        description = await getEnsText(client, { name, key: "description" });
      } catch (_) {
        description = null;
      }
      try {
        url = await getEnsText(client, { name, key: "url" });
      } catch (_) {
        url = null;
      }
      try {
        email = await getEnsText(client, { name, key: "email" });
      } catch (_) {
        email = null;
      }

      return {
        address,
        identity: name,
        platform: "basenames",
        displayName: name,
        avatar: ipfsToGateway(avatar),
        description,
        header: null,
        website: url,
        url,
        links: url ? { website: { link: url, handle: url } } : {},
        followerCount: null,
        followingCount: null,
        ensRecords: null,
        hlDomain: undefined,
        hlNfts: undefined,
        hlTokens: undefined,
        vetDomain: undefined,
        farcaster: undefined,
        location: null,
        email,
      };
    } catch (err: any) {
      console.warn("⚠️ Basename onchain resolve failed for RPC", rpcUrl, "-", err?.message || err);
      continue;
    }
  }

  return null;
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  timeoutMs = 10000,
): Promise<Response | null> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      // Retry on 429 (rate limit) or 5xx errors
      if (response.status === 429 || response.status >= 500) {
        if (i < maxRetries) {
          const delay = Math.pow(2, i) * 500; // 500ms, 1s, 2s...
          console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms for ${url}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (err: any) {
      console.error(`Fetch attempt ${i + 1} failed for ${url}:`, err?.message || err);
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return null;
    }
  }
  return null;
}

// Call Web3.bio API (universal profile first, fallback to /ns)
async function fetchWeb3BioProfile(identity: string): Promise<any | null> {
  const apiKey = Deno.env.get("WEB3BIO_API_KEY");

  const profileUrl = `https://api.web3.bio/profile/${encodeURIComponent(identity)}`;
  const nsUrl = `https://api.web3.bio/ns/${encodeURIComponent(identity)}`;

  console.log(`🔍 Fetching Web3.bio profile for: ${identity}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Web3.bio expects: X-API-KEY: Bearer {API_KEY}
  if (apiKey) {
    headers["X-API-KEY"] = `Bearer ${apiKey}`;
  }

  // 1) Try /profile (detailed, often array)
  let response = await fetchWithRetry(profileUrl, { headers }, 2, 12000);

  // If /profile fails hard, try /ns
  if (!response || (!response.ok && response.status !== 404)) {
    console.log(`⚠️ Web3.bio /profile failed, trying /ns fallback...`);
    response = await fetchWithRetry(nsUrl, { headers }, 2, 12000);
  }

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

  // /profile typically returns an array; /ns typically returns a single object
  const items = Array.isArray(data) ? data : data ? [data] : [];

  if (items.length === 0) return { notFound: true };

  // Pick the primary profile (prefer ENS/Basenames/Farcaster/Lens)
  const platformPriority = ["ens", "basenames", "farcaster", "lens", "dotbit", "unstoppabledomains", "sns", "linea"];

  let primaryProfile = items[0];
  for (const platform of platformPriority) {
    const found = items.find((p: any) => p?.platform === platform);
    if (found) {
      primaryProfile = found;
      break;
    }
  }

  // Normalize to your format
  return {
    address: primaryProfile.address ?? null,
    identity: primaryProfile.identity ?? identity,
    platform: primaryProfile.platform ?? "web3bio",
    displayName: primaryProfile.displayName ?? primaryProfile.identity ?? identity,
    avatar: primaryProfile.avatar ?? null,
    description: primaryProfile.description ?? null,
    header: primaryProfile.header ?? null,
    website: primaryProfile.links?.website?.link ?? null,
    url: primaryProfile.links?.website?.link ?? null,
    links: primaryProfile.links ?? {},
    location: primaryProfile.location ?? null,
    email: primaryProfile.email ?? null,
    farcaster: primaryProfile.links?.farcaster ?? null,
    followerCount: primaryProfile.social?.follower ?? null,
    followingCount: primaryProfile.social?.following ?? null,
    // Some responses include records/ensRecords
    ensRecords: primaryProfile.records ?? primaryProfile.ensRecords ?? null,
  };
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
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ subdomain }),
      },
      10000,
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
    console.error("❌ Namestone fetch error:", err?.message || err);
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
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ domain }),
      },
      10000,
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
    console.error("❌ HLN fetch error:", err?.message || err);
    return null;
  }
}

// Call vet.domains API for .vet domain resolution
async function fetchVetProfile(domain: string): Promise<any | null> {
  console.log(`🔍 Fetching .vet domain profile for: ${domain}`);

  try {
    const lookupUrl = `https://vet.domains/api/lookup/name/${encodeURIComponent(domain)}`;
    const response = await fetchWithRetry(lookupUrl, {}, 2, 10000);

    if (!response || !response.ok) {
      console.log(`❌ vet.domains: HTTP ${response?.status || "failed"}`);
      return null;
    }

    const data = await response.json();

    if (!data.address) {
      console.log("⚠️ vet.domains: Domain not found or no address");
      return null;
    }

    const avatarUrl = `https://vet.domains/api/avatar/${encodeURIComponent(domain)}`;

    console.log("✅ vet.domains domain resolved:", domain, "->", data.address);

    return {
      address: data.address,
      identity: domain,
      platform: "vechain",
      displayName: domain,
      avatar: avatarUrl,
      description: null,
      header: null,
      website: null,
      url: null,
      links: {},
      vetDomain: domain,
    };
  } catch (err: any) {
    console.error("❌ vet.domains fetch error:", err?.message || err);
    return null;
  }
}

// Reverse resolution for vet.domains: address -> primary name
async function fetchVetReverseProfile(address: string): Promise<any | null> {
  console.log(`🔍 Fetching .vet reverse lookup for: ${address}`);

  try {
    const lookupUrl = `https://vet.domains/api/lookup/address/${encodeURIComponent(address)}`;
    const response = await fetchWithRetry(lookupUrl, {}, 2, 10000);

    if (!response || !response.ok) {
      console.log(`❌ vet.domains reverse: HTTP ${response?.status || "failed"}`);
      return null;
    }

    const data = await response.json();

    if (!data.name || data.verified !== true) {
      console.log("⚠️ vet.domains reverse: No verified name found");
      return null;
    }

    const avatarUrl = `https://vet.domains/api/avatar/${encodeURIComponent(data.name)}`;

    console.log("✅ vet.domains reverse resolved:", address, "->", data.name);

    return {
      vetDomain: data.name,
      avatar: avatarUrl,
    };
  } catch (err: any) {
    console.error("❌ vet.domains reverse fetch error:", err?.message || err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const debug: { tried: string[]; timingsMs: Record<string, number> } = {
    tried: [],
    timingsMs: {},
  };

  try {
    const { identity } = await req.json();

    if (!identity || typeof identity !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "identity is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = identity.trim().toLowerCase();
    console.log(`\n🚀 resolve-profile called for: ${normalized}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const isWalletAddress = /^0x[a-fA-F0-9]{40}$/i.test(normalized);
    const isHlDomain = normalized.endsWith(".hl");
    const isVetDomain = normalized.endsWith(".vet");

    // Web3.bio-compatible identities:
    // include basenames (.base.eth) + your existing (.eth/.box/.world.id) + wallet addresses
    const web3BioTLDs = [".eth", ".box", ".world.id", ".base.eth"];
    const isWeb3BioCompatible = web3BioTLDs.some((tld) => normalized.endsWith(tld));

    // Namestone-only TLDs (not indexed by Web3.bio)
    const namestoneTLDs = [
      ".world",
      ".cash",
      ".apt",
      ".ton",
      ".flirtad",
      ".mexipay",
      ".guavapay",
      ".termux",
      ".spyda",
      ".mith",
      ".30315",
      ".teamxrp",
    ];
    const isNamestoneTLD = namestoneTLDs.some((tld) => normalized.endsWith(tld)) && !normalized.endsWith(".world.id");

    // Check for subdomains (2+ dots)
    const dotCount = normalized.split(".").filter(Boolean).length - 1;
    const isSubdomain = dotCount >= 2;
    const isL2EnsSubdomain =
      isSubdomain &&
      (normalized.endsWith(".eth") || normalized.endsWith(".world.id") || normalized.endsWith(".base.eth"));

    console.log(
      `📊 Identity analysis: wallet=${isWalletAddress}, hl=${isHlDomain}, vet=${isVetDomain}, web3bio=${isWeb3BioCompatible}, namestone=${isNamestoneTLD}, l2subdomain=${isL2EnsSubdomain}`,
    );

    let result: ProfileResult = { ok: false, source: "fallback", profile: null };

    // Route 1: .hl domains
    if (isHlDomain) {
      debug.tried.push("hl");
      const hlStart = Date.now();
      const hlProfile = await fetchHlProfile(normalized, supabaseUrl, supabaseKey);
      debug.timingsMs.hl = Date.now() - hlStart;

      if (hlProfile) {
        if (hlProfile.address) {
          debug.tried.push("web3bio");
          const w3Start = Date.now();
          const web3Profile = await fetchWeb3BioProfile(hlProfile.address);
          debug.timingsMs.web3bio = Date.now() - w3Start;

          if (web3Profile && !web3Profile.notFound) {
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

    // Route 2: .vet domains
    else if (isVetDomain) {
      debug.tried.push("vet");
      const vetStart = Date.now();
      const vetProfile = await fetchVetProfile(normalized);
      debug.timingsMs.vet = Date.now() - vetStart;

      if (vetProfile) {
        if (vetProfile.address) {
          debug.tried.push("web3bio");
          const w3Start = Date.now();
          const web3Profile = await fetchWeb3BioProfile(vetProfile.address);
          debug.timingsMs.web3bio = Date.now() - w3Start;

          if (web3Profile && !web3Profile.notFound) {
            result = {
              ok: true,
              source: "vet",
              profile: {
                ...web3Profile,
                vetDomain: vetProfile.vetDomain,
                avatar: vetProfile.avatar || web3Profile.avatar,
              },
            };
          } else {
            result = { ok: true, source: "vet", profile: vetProfile };
          }
        } else {
          result = { ok: true, source: "vet", profile: vetProfile };
        }
      } else {
        result = { ok: false, source: "vet", profile: null, notFound: true };
      }
    }

    // Route 3: Namestone TLDs
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

    // Route 4: Web3.bio compatible (.eth/.box/.world.id/.base.eth OR wallet)
    else if (isWeb3BioCompatible || isWalletAddress) {
      debug.tried.push("web3bio");
      const w3Start = Date.now();
      const web3Profile = await fetchWeb3BioProfile(normalized);
      debug.timingsMs.web3bio = Date.now() - w3Start;

      if (web3Profile && !web3Profile.notFound) {
        // For wallet addresses, also check for .vet reverse lookup to enrich
        if (isWalletAddress) {
          debug.tried.push("vet-reverse");
          const vetStart = Date.now();
          const vetReverse = await fetchVetReverseProfile(normalized);
          debug.timingsMs.vetReverse = Date.now() - vetStart;

          if (vetReverse && vetReverse.vetDomain) {
            result = {
              ok: true,
              source: "web3bio",
              profile: {
                ...web3Profile,
                vetDomain: vetReverse.vetDomain,
                avatar: web3Profile.avatar || vetReverse.avatar,
              },
            };
          } else {
            result = { ok: true, source: "web3bio", profile: web3Profile };
          }
        } else {
          result = { ok: true, source: "web3bio", profile: web3Profile };
        }
      }
      // Optional fallback: if Web3.bio has nothing for a subdomain
      // - For Basenames (.base.eth), resolve onchain via ENS CCIP-read
      // - Otherwise, try Namestone (for your managed subdomains)
      else if (isL2EnsSubdomain) {
        if (isBasename(normalized)) {
          console.log("🔄 Web3.bio failed for .base.eth — trying onchain ENS CCIP-read fallback");
          debug.tried.push("basenames");
          const bnStart = Date.now();
          const bnProfile = await resolveBasenameOnchain(normalized);
          debug.timingsMs.basenames = Date.now() - bnStart;

          if (bnProfile) {
            result = { ok: true, source: "basenames", profile: bnProfile };
          } else {
            result = { ok: false, source: "basenames", profile: null, notFound: true };
          }
        } else {
          console.log("🔄 Web3.bio failed for subdomain, trying Namestone fallback");
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
            result = { ok: false, source: "web3bio", profile: null, notFound: true };
          }
        }
      } else {
        result = { ok: false, source: "web3bio", profile: null, notFound: true };
      }
    }

    // Route 5: unknown - try Web3.bio catch-all
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

    console.log(
      `✅ resolve-profile completed in ${debug.timingsMs.total}ms. Source: ${result.source}, OK: ${result.ok}`,
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("❌ resolve-profile error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Internal error",
        debug: { tried: [], timingsMs: { total: Date.now() } },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
