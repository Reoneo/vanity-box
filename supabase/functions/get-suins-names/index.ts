// Fetches SuiNS (Sui Name Service) NFTs owned by an address.
// Uses Sui JSON-RPC suix_getOwnedObjects with a StructType filter for the
// SuiNS core packages (V1/V2/V3) and the Subnames package on mainnet.
// See: https://docs.suins.io/developer

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUI_RPC = 'https://fullnode.mainnet.sui.io:443';

// SuiNS active mainnet package IDs (registration NFT structs)
const SUINS_STRUCT_TYPES = [
  // Core V3 / V2 / V1 — SuinsRegistration NFT
  '0x00c2f85e07181b90c140b15c5ce27d863f93c4d9159d2a4e7bdaeb40e286d6f5::suins_registration::SuinsRegistration',
  '0xb7004c7914308557f7afbaf0dca8dd258e18e306cb7a45b28019f3d0a693f162::suins_registration::SuinsRegistration',
  '0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0::suins_registration::SuinsRegistration',
  // Subnames package — SubDomainRegistration
  '0xe177697e191327901637f8d2c5ffbbde8b1aaac27ec1024c4b62d1ebd1cd7430::subdomain_registration::SubDomainRegistration',
];

async function fetchOwnedByType(address: string, structType: string) {
  const out: any[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'suix_getOwnedObjects',
      params: [
        address,
        {
          filter: { StructType: structType },
          options: { showType: true, showDisplay: true, showContent: true },
        },
        cursor,
        50,
      ],
    };
    const r = await fetch(SUI_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    const data = j?.result?.data || [];
    for (const obj of data) {
      const display = obj?.data?.display?.data || {};
      const fields = obj?.data?.content?.fields || {};
      const objectId = obj?.data?.objectId;
      // Try to resolve the human-readable name from common fields
      const name =
        display.name ||
        fields?.domain_name ||
        fields?.name ||
        (Array.isArray(fields?.domain) ? fields.domain.join('.') : undefined) ||
        'SuiNS Name';
      const image_url =
        display.image_url ||
        display.img_url ||
        `https://api.suins.io/svg?name=${encodeURIComponent(String(name))}`;
      out.push({
        identifier: objectId,
        contract: structType,
        collection: 'SuiNS Names',
        name: String(name),
        description: display.description || 'Sui Name Service',
        image_url,
        chain: 'sui',
      });
    }
    if (!j?.result?.hasNextPage || !j?.result?.nextCursor) break;
    cursor = j.result.nextCursor;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { address } = await req.json();
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'address required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = await Promise.all(
      SUINS_STRUCT_TYPES.map((t) => fetchOwnedByType(address, t).catch(() => [])),
    );
    const names = results.flat();
    // Dedup by objectId
    const seen = new Set<string>();
    const deduped = names.filter((n) => {
      if (!n.identifier || seen.has(n.identifier)) return false;
      seen.add(n.identifier);
      return true;
    });

    return new Response(JSON.stringify({ names: deduped, total: deduped.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
