import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, walletAddress } = await req.json();
    const UD_API_KEY = Deno.env.get('UD_API_KEY');
    if (!UD_API_KEY) throw new Error('UD_API_KEY not configured');

    // Mode 1: Resolve a UD domain name to wallet/profile info
    if (domain) {
      console.log(`[resolve-ud-domain] Resolving domain: ${domain}`);
      const res = await fetch(
        `https://api.unstoppabledomains.com/resolve/domains/${encodeURIComponent(domain)}`,
        { headers: { Authorization: `Bearer ${UD_API_KEY}` } }
      );
      if (!res.ok) {
        const text = await res.text();
        console.error(`[resolve-ud-domain] UD API error ${res.status}: ${text}`);
        return new Response(JSON.stringify({ error: `UD API ${res.status}`, details: text }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await res.json();
      
      // Extract owner address from records or meta
      const ownerAddress = data?.meta?.owner || data?.records?.['crypto.ETH.address'] || null;
      const avatar = data?.records?.['social.picture.value'] || null;
      const description = data?.records?.['whois.description'] || null;
      const displayName = data?.records?.['profile.name'] || data?.meta?.domain || domain;
      const twitter = data?.records?.['social.twitter.username'] || null;
      const url = data?.records?.['ipfs.redirect_domain.value'] || data?.records?.['browser.redirect_url'] || null;
      const email = data?.records?.['whois.email.value'] || null;

      return new Response(JSON.stringify({
        domain: data?.meta?.domain || domain,
        ownerAddress,
        avatar,
        description,
        displayName,
        twitter,
        url,
        email,
        blockchain: data?.meta?.blockchain || null,
        networkId: data?.meta?.networkId || null,
        records: data?.records || {},
        meta: data?.meta || {},
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode 2: Get all UD domains owned by a wallet address
    if (walletAddress) {
      console.log(`[resolve-ud-domain] Fetching domains for wallet: ${walletAddress}`);
      
      // Use the UD Portfolio Domain Search API
      const searchUrl = `https://api.unstoppabledomains.com/domains?owners=${encodeURIComponent(walletAddress)}&sortBy=name&sortDirection=ASC&limit=100`;
      const res = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${UD_API_KEY}` },
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`[resolve-ud-domain] UD domains search error ${res.status}: ${text}`);
        return new Response(JSON.stringify({ error: `UD API ${res.status}`, domains: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await res.json();
      const domains = (data?.data || []).map((d: any) => ({
        name: d.id || d.attributes?.meta?.domain,
        blockchain: d.attributes?.meta?.blockchain || 'MATIC',
        owner: d.attributes?.meta?.owner || walletAddress,
        image_url: `https://resolve.unstoppabledomains.com/image-src/${d.id || d.attributes?.meta?.domain}`,
        records: d.attributes?.records || {},
        networkId: d.attributes?.meta?.networkId || null,
      }));

      console.log(`[resolve-ud-domain] Found ${domains.length} domains for ${walletAddress}`);
      return new Response(JSON.stringify({ domains }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Provide domain or walletAddress' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[resolve-ud-domain] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
