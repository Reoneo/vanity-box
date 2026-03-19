import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileResult {
  ok: boolean;
  source: "web3bio" | "namestone" | "hl" | "vet" | "iota" | "ud" | "fallback";
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
    iotaDomain?: string;
    udDomain?: string;
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

const UD_TLDS = new Set([
  ".888", ".polygon", ".zil", ".bitcoin", ".smobler", ".wrkx", ".ethermail", ".wif", ".u",
  ".pudgy", ".austin", ".ifg", ".lfg", ".dream", ".secret", ".ubu", ".xmr", ".wifi",
  ".retardio", ".unstoppable", ".raiin", ".mumu", ".witg", ".boomer", ".crypto", ".dao",
  ".tball", ".dfz", ".propykeys", ".metropolis", ".clay", ".nft", ".wallet", ".blockchain",
  ".pog", ".bald", ".chomp", ".stepn", ".tea", ".go", ".brave", ".vanity", ".lunar", ".x",
  ".binanceus", ".hi", ".klever", ".kresus", ".anime", ".manga",
]);

function isUdDomain(identity: string): boolean {
  const dotIndex = identity.lastIndexOf(".");
  if (dotIndex < 0) return false;
  return UD_TLDS.has(identity.slice(dotIndex).toLowerCase());
}

function isEvmAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function resolveUdEthAddress(records: Record<string, unknown>, owner: unknown): string | null {
  const preferred = [
    "crypto.ETH.address",
    "token.ETH.address",
    "wallet.ETH.address",
  ];

  for (const key of preferred) {
    const value = records[key];
    if (isEvmAddress(value)) return value;
  }

  for (const [key, value] of Object.entries(records)) {
    if (!isEvmAddress(value)) continue;
    const normalized = key.toLowerCase();
    if (normalized.includes("eth") && normalized.endsWith(".address")) return value;
  }

  if (isEvmAddress(owner)) return owner;
  return null;
}

async function fetchUdDomainSearch(domain: string, apiKey: string): Promise<any | null> {
  const response = await fetchWithRetry(
    "https://api.unstoppabledomains.com/mcp/v1/actions/ud_domains_search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: domain, limit: 5, offset: 0 }),
    },
    1,
    10000,
  );

  if (!response || !response.ok) return null;
  const data = await response.json();
  if (!Array.isArray(data?.results)) return null;
  return data.results.find((item: any) => String(item?.name || "").toLowerCase() === domain) || null;
}

// ── keccak256 via @noble/hashes ──
import { keccak_256 } from "https://esm.sh/@noble/hashes@1.7.1/sha3";

function keccak256(data: Uint8Array): Uint8Array {
  return keccak_256(data);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// EIP-137 namehash using keccak256
function udNamehash(domain: string): string {
  let node = new Uint8Array(32); // bytes32(0)
  if (!domain) return bytesToHex(node);
  const labels = domain.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(new TextEncoder().encode(labels[i]));
    const combined = new Uint8Array(64);
    combined.set(node, 0);
    combined.set(labelHash, 32);
    node = keccak256(combined);
  }
  return bytesToHex(node);
}

// ABI encode getMany(string[], uint256)
function encodeGetMany(keys: string[], tokenId: string): string {
  // selector = keccak256("getMany(string[],uint256)") first 4 bytes
  const selector = keccak256(new TextEncoder().encode("getMany(string[],uint256)")).slice(0, 4);

  // Encode: offset for keys array (64), tokenId, then array
  const tokenIdBn = BigInt(tokenId);
  const tokenIdHex = tokenIdBn.toString(16).padStart(64, "0");

  // Dynamic array offset = 64 (0x40)
  const offsetHex = "0000000000000000000000000000000000000000000000000000000000000040";

  // Array: length + each string offset + each string data
  const arrLenHex = keys.length.toString(16).padStart(64, "0");

  // Calculate string offsets (relative to start of array data after length)
  const stringParts: string[] = [];
  const offsets: number[] = [];
  let currentOffset = keys.length * 32; // after all offset slots
  for (const key of keys) {
    offsets.push(currentOffset);
    const encoded = encodeString(key);
    stringParts.push(encoded);
    currentOffset += encoded.length / 2; // in bytes
  }

  const offsetsHex = offsets.map(o => o.toString(16).padStart(64, "0")).join("");
  const stringsHex = stringParts.join("");

  return bytesToHex(selector) + offsetHex + tokenIdHex + arrLenHex + offsetsHex + stringsHex;
}

// ABI encode getData(string[], uint256) - same signature structure
function encodeGetData(keys: string[], tokenId: string): string {
  const selector = keccak256(new TextEncoder().encode("getData(string[],uint256)")).slice(0, 4);
  const tokenIdBn = BigInt(tokenId);
  const tokenIdHex = tokenIdBn.toString(16).padStart(64, "0");
  const offsetHex = "0000000000000000000000000000000000000000000000000000000000000040";
  const arrLenHex = keys.length.toString(16).padStart(64, "0");

  const stringParts: string[] = [];
  const offsets: number[] = [];
  let currentOffset = keys.length * 32;
  for (const key of keys) {
    offsets.push(currentOffset);
    const encoded = encodeString(key);
    stringParts.push(encoded);
    currentOffset += encoded.length / 2;
  }

  const offsetsHex = offsets.map(o => o.toString(16).padStart(64, "0")).join("");
  const stringsHex = stringParts.join("");

  return bytesToHex(selector) + offsetHex + tokenIdHex + arrLenHex + offsetsHex + stringsHex;
}

function encodeString(s: string): string {
  const bytes = new TextEncoder().encode(s);
  const lenHex = bytes.length.toString(16).padStart(64, "0");
  const paddedLen = Math.ceil(bytes.length / 32) * 32;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  return lenHex + Array.from(padded).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Decode ABI: getMany returns string[]
function decodeGetManyResult(hex: string): string[] {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length < 128) return [];
  try {
    // Return: offset(word0) -> array
    // word0 = offset to array (should be 0x20 = 32)
    const arrByteOffset = parseInt(clean.slice(0, 64), 16);
    const arrWordStart = arrByteOffset * 2; // convert to hex chars offset
    const arrLen = parseInt(clean.slice(arrWordStart, arrWordStart + 64), 16);
    if (arrLen === 0 || arrLen > 100) return [];

    // Read string offsets (relative to array data start = arrWordStart + 64)
    const dataStart = arrWordStart + 64; // after array length
    const results: string[] = [];
    for (let i = 0; i < arrLen; i++) {
      const offsetPos = dataStart + i * 64;
      if (offsetPos + 64 > clean.length) break;
      const strByteOffset = parseInt(clean.slice(offsetPos, offsetPos + 64), 16);
      // strByteOffset is relative to dataStart (in bytes), convert to hex chars
      const strLenPos = dataStart + strByteOffset * 2;
      if (strLenPos + 64 > clean.length) { results.push(""); continue; }
      const strLen = parseInt(clean.slice(strLenPos, strLenPos + 64), 16);
      if (strLen === 0) { results.push(""); continue; }
      const strDataPos = strLenPos + 64;
      if (strDataPos + strLen * 2 > clean.length) { results.push(""); continue; }
      const strHex = clean.slice(strDataPos, strDataPos + strLen * 2);
      results.push(new TextDecoder().decode(hexToBytes(strHex)));
    }
    return results;
  } catch (e) {
    console.log(`⚠️ decodeGetManyResult error: ${e}`);
    return [];
  }
}

// Decode ABI: getData returns (address resolver, address owner, string[] values)
function decodeGetDataResult(hex: string): { resolver: string; owner: string; values: string[] } {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const empty = { resolver: "0x0000000000000000000000000000000000000000", owner: "0x0000000000000000000000000000000000000000", values: [] };
  if (clean.length < 192) return empty;
  try {
    // word0 = resolver (address, right-aligned in 32 bytes)
    const resolver = "0x" + clean.slice(24, 64);
    // word1 = owner
    const owner = "0x" + clean.slice(88, 128);
    // word2 = offset to string[] (from start of return data, in bytes)
    const arrByteOffset = parseInt(clean.slice(128, 192), 16);
    const arrHexOffset = arrByteOffset * 2;

    if (arrHexOffset + 64 > clean.length) return { resolver, owner, values: [] };
    const arrLen = parseInt(clean.slice(arrHexOffset, arrHexOffset + 64), 16);
    if (arrLen === 0 || arrLen > 100) return { resolver, owner, values: [] };

    const dataStart = arrHexOffset + 64;
    const values: string[] = [];
    for (let i = 0; i < arrLen; i++) {
      const offsetPos = dataStart + i * 64;
      if (offsetPos + 64 > clean.length) break;
      const strByteOffset = parseInt(clean.slice(offsetPos, offsetPos + 64), 16);
      const strLenPos = dataStart + strByteOffset * 2;
      if (strLenPos + 64 > clean.length) { values.push(""); continue; }
      const strLen = parseInt(clean.slice(strLenPos, strLenPos + 64), 16);
      if (strLen === 0) { values.push(""); continue; }
      const strDataPos = strLenPos + 64;
      if (strDataPos + strLen * 2 > clean.length) { values.push(""); continue; }
      const strHex = clean.slice(strDataPos, strDataPos + strLen * 2);
      values.push(new TextDecoder().decode(hexToBytes(strHex)));
    }
    return { resolver, owner, values };
  } catch (e) {
    console.log(`⚠️ decodeGetDataResult error: ${e}`);
    return empty;
  }
}



const PROXY_READER = "0x1BDC0fD4fbABeed3E611fd6195fCd5d41dcEF393";
const UNS_REGISTRY = "0x049aba7510f45BA5b64ea9E658E342F904DB358D";

const RECORD_KEYS = [
  "crypto.ETH.address",
  "crypto.BTC.address",
  "social.twitter.username",
  "social.picture.value",
  "profile.name",
  "whois.description",
  "whois.email.value",
  "browser.redirect_url",
  "ipfs.redirect_domain.value",
];

// CNS TLDs that use ProxyReader
const CNS_TLDS = new Set([
  ".crypto", ".wallet", ".nft", ".x", ".blockchain", ".bitcoin", ".dao", ".888",
  ".binanceus", ".hi", ".klever", ".kresus", ".anime", ".manga",
]);

function isCnsDomain(domain: string): boolean {
  const dotIdx = domain.lastIndexOf(".");
  if (dotIdx < 0) return false;
  return CNS_TLDS.has(domain.slice(dotIdx).toLowerCase());
}

async function ethCall(rpcUrl: string, to: string, data: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    }, 15000);
    const json = await res.json();
    if (json.error) {
      console.log(`⚠️ eth_call error: ${JSON.stringify(json.error)}`);
      return null;
    }
    return json.result || null;
  } catch (e: any) {
    console.log(`❌ eth_call exception: ${e.message}`);
    return null;
  }
}

function buildUdProfileFromRecords(domain: string, records: Record<string, string>, owner: string | null): any | null {
  const address = resolveUdEthAddress(records, owner);

  const validUrl = (v: string | undefined) => v && v !== "undefined" && v.length > 1 ? v : null;
  const website = validUrl(records["browser.redirect_url"]) || validUrl(records["ipfs.redirect_domain.value"]);

  const twitter = records["social.twitter.username"] || null;

  const links: Record<string, any> = {};
  if (twitter) links.twitter = { link: `https://twitter.com/${twitter}`, handle: twitter };
  if (website) links.website = { link: website };

  if (!address && !isEvmAddress(owner)) return null;

  return {
    address: address || owner,
    identity: domain,
    platform: "unstoppabledomains",
    displayName: records["profile.name"] || domain,
    avatar: records["social.picture.value"] || `https://metadata.unstoppabledomains.com/image-src/${domain}`,
    description: records["whois.description"] || null,
    header: null,
    website,
    url: website,
    links,
    email: records["whois.email.value"] || null,
    location: null,
    udDomain: domain,
  };
}

async function fetchUdProfile(domain: string): Promise<any | null> {
  const alchemyKey = Deno.env.get("ALCHEMY_API_KEY");
  const ethRpc = alchemyKey
    ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : "https://cloudflare-eth.com";
  const polyRpc = alchemyKey
    ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : "https://polygon-rpc.com";

  const tokenId = udNamehash(domain);
  const isCns = isCnsDomain(domain);

  console.log(`🔍 UD on-chain: resolving ${domain}, tokenId=${tokenId}, cns=${isCns}`);

  // Try Polygon first, then Ethereum (per UD recommendation)
  for (const [chainName, rpcUrl] of [["Polygon", polyRpc], ["Ethereum", ethRpc]]) {
    console.log(`🔗 UD: Trying ${chainName} for ${domain}`);

    let values: string[] = [];
    let owner: string | null = null;

    if (isCns) {
      const calldata = encodeGetMany(RECORD_KEYS, tokenId);
      const rawResult = await ethCall(rpcUrl, PROXY_READER, calldata);
      if (!rawResult || rawResult === "0x" || rawResult.length < 10) {
        console.log(`⚠️ UD ${chainName}: empty result`);
        continue;
      }
      values = decodeGetManyResult(rawResult);
    } else {
      const calldata = encodeGetData(RECORD_KEYS, tokenId);
      const rawResult = await ethCall(rpcUrl, UNS_REGISTRY, calldata);
      if (!rawResult || rawResult === "0x" || rawResult.length < 10) {
        console.log(`⚠️ UD ${chainName}: empty result`);
        continue;
      }
      const decoded = decodeGetDataResult(rawResult);
      owner = decoded.owner === "0x0000000000000000000000000000000000000000" ? null : decoded.owner;
      values = decoded.values;
    }

    console.log(`📋 UD ${chainName} values: ${JSON.stringify(values)}, owner: ${owner}`);

    // Build records map
    const records: Record<string, string> = {};
    for (let i = 0; i < RECORD_KEYS.length && i < values.length; i++) {
      if (values[i]) records[RECORD_KEYS[i]] = values[i];
    }

    const profile = buildUdProfileFromRecords(domain, records, owner);
    if (profile) {
      console.log(`✅ UD ${chainName}: resolved ${domain} -> ${profile.address}`);
      return profile;
    }

    // If we got owner but no ETH address record, still build minimal profile
    if (owner && isEvmAddress(owner)) {
      console.log(`✅ UD ${chainName}: resolved ${domain} via owner -> ${owner}`);
      return {
        address: owner,
        identity: domain,
        platform: "unstoppabledomains",
        displayName: records["profile.name"] || domain,
        avatar: records["social.picture.value"] || `https://metadata.unstoppabledomains.com/image-src/${domain}`,
        description: records["whois.description"] || null,
        header: null,
        website: records["browser.redirect_url"] || null,
        url: records["browser.redirect_url"] || null,
        links: {},
        email: records["whois.email.value"] || null,
        location: null,
        udDomain: domain,
      };
    }
  }

  console.log(`❌ UD: On-chain resolution failed for ${domain}`);
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

// Call vet.domains API for .vet domain resolution
async function fetchVetProfile(domain: string): Promise<any | null> {
  console.log(`🔍 Fetching .vet domain profile for: ${domain}`);
  
  try {
    // Forward resolution: name -> address
    const lookupUrl = `https://vet.domains/api/lookup/name/${encodeURIComponent(domain)}`;
    const response = await fetchWithRetry(lookupUrl, {}, 2, 10000);
    
    if (!response || !response.ok) {
      console.log(`❌ vet.domains: HTTP ${response?.status || 'failed'}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.address) {
      console.log("⚠️ vet.domains: Domain not found or no address");
      return null;
    }
    
    // Build avatar URL
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
    console.error("❌ vet.domains fetch error:", err.message);
    return null;
  }
}

// Call IOTA Names resolver
async function fetchIotaProfile(domain: string, supabaseUrl: string, supabaseKey: string): Promise<any | null> {
  console.log(`🔍 Fetching .iota domain profile for: ${domain}`);
  
  try {
    const response = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/resolve-iota-domain`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ domain }),
      },
      15000
    );
    
    if (!response.ok) {
      console.log(`❌ IOTA Names: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.notFound || data.error) {
      console.log("⚠️ IOTA Names: Domain not found");
      return null;
    }
    
    console.log("✅ IOTA Names domain resolved:", data.identity);
    return {
      address: data.address,
      identity: data.identity,
      platform: "iota",
      displayName: data.displayName || data.identity,
      avatar: data.avatar || null,
      description: data.description || null,
      header: null,
      website: data.website || null,
      url: null,
      links: data.links || {},
      iotaDomain: data.iotaDomain || data.identity,
    };
  } catch (err: any) {
    console.error("❌ IOTA Names fetch error:", err.message);
    return null;
  }
}

// Reverse resolution for IOTA: address -> primary .iota name
async function fetchIotaReverseProfile(address: string, supabaseUrl: string, supabaseKey: string): Promise<any | null> {
  console.log(`🔍 Fetching IOTA reverse lookup for: ${address}`);
  
  try {
    const response = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/resolve-iota-address`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ address }),
      },
      10000
    );
    
    if (!response.ok) {
      console.log(`❌ IOTA reverse: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.name) {
      console.log("⚠️ IOTA reverse: No name found for address");
      return null;
    }
    
    console.log(`✅ IOTA reverse resolved: ${address} -> ${data.name}`);
    
    return {
      iotaDomain: data.name,
    };
  } catch (err: any) {
    console.error("❌ IOTA reverse fetch error:", err.message);
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
      console.log(`❌ vet.domains reverse: HTTP ${response?.status || 'failed'}`);
      return null;
    }
    
    const data = await response.json();
    
    // Only use verified reverse records (anti-spoof protection)
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
    console.error("❌ vet.domains reverse fetch error:", err.message);
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
    const { identity, resolver } = await req.json();

    if (!identity || typeof identity !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "identity is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalized = identity.trim().toLowerCase();
    const forceUd = resolver === "ud";
    console.log(`\n🚀 resolve-profile called for: ${normalized}`, { forceUd });

    // Get Supabase config for internal edge function calls
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Determine identity type
    // EVM wallet addresses are 40 hex chars (0x + 40)
    const isEvmWalletAddress = /^0x[a-fA-F0-9]{40}$/i.test(normalized);
    // IOTA wallet addresses are 64 hex chars (0x + 64)
    const isIotaWalletAddress = /^0x[a-fA-F0-9]{64}$/i.test(normalized);
    const isWalletAddress = isEvmWalletAddress || isIotaWalletAddress;
    const isHlDomain = normalized.endsWith(".hl");
    const isVetDomain = normalized.endsWith(".vet");
    const isIotaDomain = normalized.endsWith(".iota");
    const isUd = isUdDomain(normalized);

    // Web3.bio-compatible TLDs
    const web3BioTLDs = [".eth", ".box", ".world.id"];
    const isWeb3BioCompatible = web3BioTLDs.some(tld => normalized.endsWith(tld));

    // Special handling for base.eth subdomains (e.g., guy.base.eth)
    const isBaseEthSubdomain = normalized.endsWith(".base.eth") && normalized !== "base.eth";

    // Namestone-only TLDs (not indexed by Web3.bio)
    const namestoneTLDs = [".world", ".cash", ".apt", ".ton", ".flirtad", ".mexipay", ".guavapay", ".termux", ".spyda", ".mith", ".30315", ".teamxrp"];
    const isNamestoneTLD = namestoneTLDs.some(tld => normalized.endsWith(tld)) && !normalized.endsWith(".world.id");

    // Check for subdomains (2+ dots)
    const dotCount = normalized.split('.').filter(Boolean).length - 1;
    const isSubdomain = dotCount >= 2;
    const isL2EnsSubdomain = isSubdomain && (normalized.endsWith(".eth") || normalized.endsWith(".world.id")) && !isBaseEthSubdomain;

    console.log(`📊 Identity analysis: wallet=${isWalletAddress}, hl=${isHlDomain}, vet=${isVetDomain}, iota=${isIotaDomain}, ud=${isUd || forceUd}, web3bio=${isWeb3BioCompatible}, namestone=${isNamestoneTLD}, l2subdomain=${isL2EnsSubdomain}, baseEthSubdomain=${isBaseEthSubdomain}`);

    let result: ProfileResult = { ok: false, source: "fallback", profile: null };
    
    // Route 0: Unstoppable Domains (official UD APIs via backend)
    if (forceUd || isUd) {
      debug.tried.push("ud");
      const udStart = Date.now();
      const udProfile = await fetchUdProfile(normalized);
      debug.timingsMs.ud = Date.now() - udStart;

      if (udProfile) {
        result = { ok: true, source: "ud", profile: udProfile };
      } else {
        result = { ok: false, source: "ud", profile: null, notFound: true };
      }
    }
    // Route 1: .hl domains
    else if (isHlDomain) {
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
    // Route 2: .vet domains (vet.domains API)
    else if (isVetDomain) {
      debug.tried.push("vet");
      const vetStart = Date.now();
      const vetProfile = await fetchVetProfile(normalized);
      debug.timingsMs.vet = Date.now() - vetStart;
      
      if (vetProfile) {
        // Optionally enrich with Web3.bio using the resolved address
        if (vetProfile.address) {
          debug.tried.push("web3bio");
          const w3Start = Date.now();
          const web3Profile = await fetchWeb3BioProfile(vetProfile.address);
          debug.timingsMs.web3bio = Date.now() - w3Start;
          
          if (web3Profile && !web3Profile.notFound) {
            // Merge, keeping VET-specific data
            result = {
              ok: true,
              source: "vet",
              profile: {
                ...web3Profile,
                vetDomain: vetProfile.vetDomain,
                avatar: vetProfile.avatar || web3Profile.avatar, // Prefer VET avatar
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
    // Route 3: .iota domains (IOTA Names)
    else if (isIotaDomain) {
      debug.tried.push("iota");
      const iotaStart = Date.now();
      const iotaProfile = await fetchIotaProfile(normalized, supabaseUrl, supabaseKey);
      debug.timingsMs.iota = Date.now() - iotaStart;
      
      if (iotaProfile) {
        // Enrich with Web3.bio data (Farcaster, social links, etc.) if we have an address
        if (iotaProfile.address) {
          debug.tried.push("web3bio");
          const w3Start = Date.now();
          const web3Profile = await fetchWeb3BioProfile(iotaProfile.address);
          debug.timingsMs.web3bio = Date.now() - w3Start;
          
          if (web3Profile && !web3Profile.notFound) {
            console.log("✅ Enriching IOTA profile with Web3.bio data");
            // Merge, keeping IOTA-specific data and preferring IOTA avatar/name
            result = {
              ok: true,
              source: "iota",
              profile: {
                ...web3Profile,
                // Override with IOTA-specific data
                identity: iotaProfile.identity,
                platform: "iota",
                displayName: iotaProfile.displayName || web3Profile.displayName,
                avatar: iotaProfile.avatar || web3Profile.avatar,
                description: iotaProfile.description || web3Profile.description,
                iotaDomain: iotaProfile.iotaDomain,
                // Merge links (IOTA links take priority, then Web3.bio)
                links: {
                  ...web3Profile.links,
                  ...iotaProfile.links,
                },
                farcaster: web3Profile.farcaster || web3Profile.links?.farcaster,
              },
            };
          } else {
            result = { ok: true, source: "iota", profile: iotaProfile };
          }
        } else {
          result = { ok: true, source: "iota", profile: iotaProfile };
        }
      } else {
        result = { ok: false, source: "iota", profile: null, notFound: true };
      }
    }
    // Route 4: Namestone TLDs (direct Namestone lookup)
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
    // Route 3a: base.eth subdomains - use Web3.bio Basenames-specific endpoint
    else if (isBaseEthSubdomain) {
      console.log(`🔍 base.eth subdomain detected, using Web3.bio Basenames endpoint`);
      debug.tried.push("web3bio-basenames");
      const w3Start = Date.now();
      
      // Use the Basenames-specific endpoint for base.eth subdomains
      const apiKey = Deno.env.get("WEB3BIO_API_KEY");
      const basenamesUrl = `https://api.web3.bio/profile/basenames/${encodeURIComponent(normalized)}`;
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["X-API-Key"] = apiKey;
      
      console.log(`📡 Calling Web3.bio Basenames API: ${basenamesUrl}`);
      const response = await fetchWithRetry(basenamesUrl, { headers }, 2, 12000);
      debug.timingsMs.web3bio = Date.now() - w3Start;
      
      if (response && response.ok) {
        const data = await response.json();
        console.log(`📥 Basenames API response:`, JSON.stringify(data).substring(0, 300));
        
        if (data && !data.error && data.address) {
          console.log(`✅ base.eth subdomain resolved: ${normalized} -> ${data.address}`);
          result = {
            ok: true,
            source: "web3bio",
            profile: {
              address: data.address,
              identity: normalized,
              platform: "basenames",
              displayName: data.displayName || normalized,
              avatar: data.avatar,
              description: data.description,
              header: data.header,
              website: data.links?.website?.link,
              url: data.links?.website?.link,
              links: data.links || {},
              ensRecords: data.records || {},
              location: data.location,
              email: data.email,
            },
          };
        } else {
          console.log(`⚠️ base.eth subdomain not found or no address in response`);
          result = { ok: false, source: "web3bio", profile: null, notFound: true };
        }
      } else {
        const errorText = response ? await response.text() : 'No response';
        console.log(`❌ Web3.bio Basenames endpoint failed: ${errorText}`);
        result = { ok: false, source: "web3bio", profile: null, notFound: true };
      }
    }
    // Route 3b: Web3.bio-compatible (.eth, .box, .world.id, wallet addresses)
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
            console.log(`✅ Enriching wallet profile with .vet primary name: ${vetReverse.vetDomain}`);
            result = {
              ok: true,
              source: "web3bio",
              profile: {
                ...web3Profile,
                vetDomain: vetReverse.vetDomain,
                // Use .vet avatar if web3bio doesn't have one
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
      // Fallback for wallet addresses: try IOTA reverse (for 64-char addresses) or .vet reverse, then create minimal profile
      else if (isWalletAddress) {
        // Try IOTA reverse lookup for 64-char addresses
        if (isIotaWalletAddress) {
          console.log("🔄 Trying IOTA reverse lookup for wallet address");
          debug.tried.push("iota-reverse");
          const iotaStart = Date.now();
          const iotaReverse = await fetchIotaReverseProfile(normalized, supabaseUrl, supabaseKey);
          debug.timingsMs.iotaReverse = Date.now() - iotaStart;
          
          if (iotaReverse && iotaReverse.iotaDomain) {
            console.log(`✅ Found .iota primary name: ${iotaReverse.iotaDomain}`);
            // Now fetch the full IOTA profile for this domain
            debug.tried.push("iota");
            const iotaProfileStart = Date.now();
            const iotaProfile = await fetchIotaProfile(iotaReverse.iotaDomain, supabaseUrl, supabaseKey);
            debug.timingsMs.iota = Date.now() - iotaProfileStart;
            
            if (iotaProfile) {
              result = {
                ok: true,
                source: "iota",
                profile: {
                  ...iotaProfile,
                  address: normalized,
                  iotaDomain: iotaReverse.iotaDomain,
                },
              };
            } else {
              // Return basic profile with just the domain
              result = {
                ok: true,
                source: "iota",
                profile: {
                  address: normalized,
                  identity: iotaReverse.iotaDomain,
                  platform: "iota",
                  displayName: iotaReverse.iotaDomain,
                  avatar: null,
                  description: null,
                  header: null,
                  website: null,
                  url: null,
                  links: {},
                  iotaDomain: iotaReverse.iotaDomain,
                },
              };
            }
          } else {
            console.log("🔄 No .iota name found, creating minimal IOTA wallet profile");
            result = {
              ok: true,
              source: "fallback",
              profile: {
                address: normalized,
                identity: normalized,
                platform: "iota",
                displayName: null,
                avatar: null,
                description: null,
                header: null,
                website: null,
                url: null,
                links: {},
              },
            };
          }
        } else {
          // Try .vet reverse lookup for EVM addresses
          console.log("🔄 Trying .vet reverse lookup for wallet address");
          debug.tried.push("vet-reverse");
          const vetStart = Date.now();
          const vetReverse = await fetchVetReverseProfile(normalized);
          debug.timingsMs.vetReverse = Date.now() - vetStart;
          
          if (vetReverse && vetReverse.vetDomain) {
            console.log(`✅ Found .vet primary name: ${vetReverse.vetDomain}`);
            result = {
              ok: true,
              source: "vet",
              profile: {
                address: normalized,
                identity: vetReverse.vetDomain,
                platform: "vechain",
                displayName: vetReverse.vetDomain,
                avatar: vetReverse.avatar,
                description: null,
                header: null,
                website: null,
                url: null,
                links: {},
                vetDomain: vetReverse.vetDomain,
              },
            };
          } else {
            console.log("🔄 No .vet name found, creating minimal wallet profile");
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
          }
        }
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
