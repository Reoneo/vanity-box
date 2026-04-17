import { corsHeaders } from '@supabase/supabase-js/cors'

const SUI_RPC = 'https://fullnode.mainnet.sui.io:443';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { address } = await req.json();
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'address required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const nfts: any[] = [];
    let cursor: string | null = null;
    let pages = 0;
    while (pages < 50) {
      const body = {
        jsonrpc: '2.0', id: 1, method: 'suix_getOwnedObjects',
        params: [
          address,
          { filter: null, options: { showType: true, showDisplay: true, showContent: true, showOwner: false } },
          cursor, 50,
        ],
      };
      const r = await fetch(SUI_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      const data = j?.result?.data || [];
      for (const obj of data) {
        const display = obj?.data?.display?.data;
        const type = obj?.data?.type as string | undefined;
        // Heuristic: only objects with a display image are likely NFTs
        if (display && (display.image_url || display.img_url)) {
          const collection = type ? type.split('::').slice(0, 2).join('::') : 'Sui Object';
          nfts.push({
            identifier: obj?.data?.objectId,
            contract: type || '',
            collection,
            name: display.name || display.title || 'Sui NFT',
            description: display.description || '',
            image_url: display.image_url || display.img_url,
            chain: 'sui',
          });
        }
      }
      if (!j?.result?.hasNextPage || !j?.result?.nextCursor) break;
      cursor = j.result.nextCursor;
      pages++;
    }

    return new Response(JSON.stringify({ nfts, total: nfts.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
