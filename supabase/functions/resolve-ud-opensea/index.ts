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

async function fetchOwner(
  apiKey: string,
  chain: string,
  contract: string,
  tokenIdDecimal: string,
): Promise<{ owner: string; image: string | null } | null> {
  const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${contract}/nfts/${tokenIdDecimal}`;
  try {
    const res = await fetch(url, { headers: { "x-api-key": apiKey, accept: "application/json" } });
    if (!res.ok) {
      console.log(`OpenSea ${chain}/${contract} -> ${res.status}`);
      return null;
    }
    const data = await res.json();
    const nft = data?.nft;
    const image = nft?.display_image_url || nft?.image_url || nft?.metadata?.image || null;
    const owners = nft?.owners;
    let owner: string | null = null;
    if (Array.isArray(owners) && owners.length > 0 && owners[0]?.address) owner = owners[0].address;
    else if (nft?.owner && typeof nft.owner === "string") owner = nft.owner;
    return owner ? { owner, image } as any : null;
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
    const results = await Promise.all(
      UD_CONTRACTS.map((c) => fetchOwner(apiKey, c.chain, c.address, tokenIdDecimal).then((res) => ({ ...c, ...res }))),
    );

    const hit = results.find((r: any) => r.owner && /^0x[a-fA-F0-9]{40}$/.test(r.owner));

    if (!hit) {
      return new Response(
        JSON.stringify({ ok: false, domain: normalized, tokenId: tokenIdDecimal, notFound: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        domain: normalized,
        address: (hit as any).owner,
        image: (hit as any).image || null,
        chain: hit.chain,
        contract: hit.address,
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
