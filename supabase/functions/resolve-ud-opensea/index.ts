import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { namehash } from "https://esm.sh/viem@2.21.0/ens";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Known Unstoppable Domains NFT contracts
const UD_CONTRACTS: Array<{ chain: string; address: string }> = [
  // UNS Registry — Ethereum
  { chain: "ethereum", address: "0x049aba7510f45ba5b64ea9e658e342f904db358d" },
  // CNS Registry — Ethereum (legacy .crypto)
  { chain: "ethereum", address: "0xd1e5b0ff1287aa9f9a268759062e4ab08b9dacbe" },
  // UNS Registry — Polygon (matic)
  { chain: "matic", address: "0xa9a6a3626993d487d2dbda3173cf58ca1a9d9e9f" },
  // UNS Registry — Base
  { chain: "base", address: "0xc3c2bce847f56b7f8f9bd9ae8651b9b8f786af07" },
];

const OPENSEA_UD_COLLECTION_SLUG = "unstoppable-domains-polygon";
const isEvmAddress = (value: unknown): value is string => /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());

const normalizeMediaUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("ipfs://ipfs/")) return `https://ipfs.io/ipfs/${trimmed.slice("ipfs://ipfs/".length)}`;
  if (trimmed.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${trimmed.slice("ipfs://".length)}`;
  if (trimmed.startsWith("ar://")) return `https://arweave.net/${trimmed.slice("ar://".length)}`;
  return trimmed;
};

const firstUrl = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = normalizeMediaUrl(value);
    if (normalized) return normalized;
  }
  return null;
};

async function fetchJson(url: string, headers: HeadersInit = {}): Promise<any | null> {
  const normalizedUrl = normalizeMediaUrl(url);
  if (!normalizedUrl) return null;
  try {
    const res = await fetch(normalizedUrl, { headers: { accept: "application/json", ...headers } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchOwners(apiKey: string, chain: string, contract: string, tokenIdDecimal: string): Promise<string | null> {
  const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${contract}/nfts/${tokenIdDecimal}/owners`;
  const data = await fetchJson(url, { "x-api-key": apiKey });
  const owner = data?.owners?.find?.((o: any) => isEvmAddress(o?.address))?.address;
  return owner || null;
}

async function fetchUdFallback(domain: string): Promise<{ owner: string | null; image: string | null; records?: Record<string, string> }> {
  const udApiKey = Deno.env.get("UD_API_KEY");
  const authHeaders = udApiKey ? { Authorization: `Bearer ${udApiKey}` } : {};
  const [profile, resolution] = await Promise.all([
    fetchJson(`https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(domain)}`, authHeaders),
    fetchJson(`https://resolve.unstoppabledomains.com/domains/${encodeURIComponent(domain)}`, authHeaders),
  ]);
  const records = { ...(resolution?.records || {}), ...(profile?.records || {}) };
  const verifications: Array<{ symbol?: string; address?: string }> = Array.isArray(profile?.cryptoVerifications) ? profile.cryptoVerifications : [];
  const ethAddress = verifications.find((v) => v.symbol === "ETH")?.address;
  const maticAddress = verifications.find((v) => v.symbol === "MATIC")?.address;
  const owner = [
    ethAddress,
    maticAddress,
    records?.["crypto.ETH.address"],
    records?.["crypto.MATIC.version.MATIC.address"],
    records?.["crypto.MATIC.address"],
    records?.["crypto.POL.address"],
    resolution?.meta?.owner,
    resolution?.metadata?.owner,
    profile?.metadata?.owner,
  ].find(isEvmAddress) || null;
  const image = firstUrl(profile?.profile?.imagePath, profile?.profile?.imageUrl, profile?.metadata?.image, profile?.image);
  return { owner, image, records };
}

async function fetchOwner(
  apiKey: string,
  chain: string,
  contract: string,
  tokenIdDecimal: string,
): Promise<{ owner: string; image: string | null } | null> {
  // v2 — explicit image extraction
  const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${contract}/nfts/${tokenIdDecimal}`;
  try {
    const res = await fetch(url, { headers: { "x-api-key": apiKey, accept: "application/json" } });
    if (!res.ok) {
      console.log(`OpenSea ${chain}/${contract} -> ${res.status}`);
      return null;
    }
    const data = await res.json();
    const nft = data?.nft || data;
    let image = firstUrl(
      nft?.display_image_url,
      nft?.image_url,
      nft?.image_original_url,
      nft?.animation_url,
      nft?.metadata?.image,
      nft?.metadata?.image_url,
    );
    if (!image) {
      const metadata = await fetchJson(nft?.metadata_url || nft?.token_uri || nft?.token_metadata);
      image = firstUrl(metadata?.image, metadata?.image_url, metadata?.animation_url);
    }
    const owners = nft?.owners;
    let owner: string | null = null;
    if (Array.isArray(owners) && owners.length > 0 && owners[0]?.address) owner = owners[0].address;
    else if (nft?.owner && typeof nft.owner === "string") owner = nft.owner;
    else if (nft?.owner?.address) owner = nft.owner.address;
    if (!owner) owner = await fetchOwners(apiKey, chain, contract, tokenIdDecimal);
    return owner ? { owner, image } as any : image ? ({ owner: "", image } as any) : null;
  } catch (e) {
    console.error("OpenSea fetch error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENSEA_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENSEA_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = domain.trim().toLowerCase();
    const hash = namehash(normalized); // 0x...
    const tokenIdDecimal = BigInt(hash).toString(10);

    // Try contracts in parallel
    const [results, udFallback] = await Promise.all([
      Promise.all(
        UD_CONTRACTS.map((c) => fetchOwner(apiKey, c.chain, c.address, tokenIdDecimal).then((res) => ({ ...c, ...res }))),
      ),
      fetchUdFallback(normalized).catch(() => ({ owner: null, image: null })),
    ]);

    const hit = results.find((r: any) => r.owner && /^0x[a-fA-F0-9]{40}$/.test(r.owner));
    const imageHit = results.find((r: any) => r.image)?.image || udFallback.image || null;

    if (!hit && !udFallback.owner) {
      return new Response(
        JSON.stringify({ ok: false, domain: normalized, tokenId: tokenIdDecimal, image: imageHit, notFound: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resolvedAddress = (hit as any)?.owner || udFallback.owner;

    return new Response(
      JSON.stringify({
        ok: true,
        domain: normalized,
        address: resolvedAddress,
        image: (hit as any)?.image || imageHit,
        chain: (hit as any)?.chain || "ud-profile",
        contract: (hit as any)?.address || null,
        tokenId: tokenIdDecimal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("resolve-ud-opensea error", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
