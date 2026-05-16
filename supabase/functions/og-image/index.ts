import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const xmlEscape = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const normalizeMediaUrl = (raw?: string | null): string | null => {
  const v = (raw || '').trim();
  if (!v) return null;
  if (v.startsWith('ipfs://ipfs/')) return `https://ipfs.io/ipfs/${v.slice('ipfs://ipfs/'.length)}`;
  if (v.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${v.slice('ipfs://'.length)}`;
  if (v.startsWith('ar://')) return `https://arweave.net/${v.slice('ar://'.length)}`;
  return v;
};

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 6000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Convert remote image to data URI so the SVG renderer can rasterize it. */
async function imageToDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/png';
    if (ct.includes('svg')) {
      // Many renderers struggle with nested SVGs via <image>; skip.
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 4_000_000) return null;
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

async function resolveAvatarForUsername(username: string): Promise<{
  avatar: string | null;
  displayName: string | null;
}> {
  const u = username.trim().toLowerCase();

  // 1) Web3.bio covers .eth, .box, .sol, .farcaster, .lens, addresses, etc.
  try {
    const r = await fetchWithTimeout(`https://api.web3.bio/profile/${encodeURIComponent(u)}`, {}, 7000);
    if (r.ok) {
      const data = await r.json();
      const arr = Array.isArray(data) ? data : [data];
      const priority = ['ens', 'basenames', 'farcaster', 'lens', 'unstoppabledomains'];
      let primary: any = arr[0];
      for (const p of priority) {
        const f = arr.find((x: any) => x?.platform === p);
        if (f) { primary = f; break; }
      }
      if (primary?.avatar) {
        return { avatar: normalizeMediaUrl(primary.avatar), displayName: primary.displayName || primary.identity || null };
      }
    }
  } catch (e) {
    console.log('web3bio failed', (e as Error).message);
  }

  // 2) IOTA Names indexer
  if (u.endsWith('.iota')) {
    try {
      const r = await fetchWithTimeout('https://api.mainnet.iota.cafe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'iotax_iotaNamesLookup', params: [u] }),
      }, 7000);
      if (r.ok) {
        const j = await r.json();
        const target = j?.result?.targetAddress;
        if (target) {
          // Try to fetch onchain profile avatar via vanity edge profile lookup
          // Fall back to no avatar — still gives a clean OG image with initials
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
            const profileRes = await fetchWithTimeout(`${supabaseUrl}/functions/v1/get-iota-profile?name=${encodeURIComponent(u)}`, {
              headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}` },
            }, 5000);
            if (profileRes.ok) {
              const pj = await profileRes.json();
              const av = pj?.profile?.avatar || pj?.avatar;
              if (av) return { avatar: normalizeMediaUrl(av), displayName: u };
            }
          } catch {}
        }
      }
    } catch (e) {
      console.log('iota failed', (e as Error).message);
    }
  }

  // 3) Unstoppable Domains Profile API (covers .vanity and all UD TLDs)
  if (u.includes('.')) {
    try {
      const r = await fetchWithTimeout(`https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(u)}`, {}, 7000);
      if (r.ok) {
        const j = await r.json();
        const av = j?.profile?.imagePath || j?.profile?.imageUrl || j?.profile?.avatar;
        const dn = j?.profile?.displayName || u;
        if (av) return { avatar: normalizeMediaUrl(av), displayName: dn };
      }
    } catch (e) {
      console.log('ud failed', (e as Error).message);
    }
  }

  return { avatar: null, displayName: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    let avatar = url.searchParams.get('avatar');
    const banner = url.searchParams.get('banner');
    let displayName = url.searchParams.get('displayName');

    if (!username) throw new Error('Username is required');

    // If avatar not explicitly passed, resolve it server-side from username.
    if (!avatar) {
      const resolved = await resolveAvatarForUsername(username);
      avatar = resolved.avatar;
      if (!displayName && resolved.displayName) displayName = resolved.displayName;
    } else {
      avatar = normalizeMediaUrl(avatar);
    }

    // Embed avatar as data URI for reliable rasterization by social previews.
    let avatarDataUri: string | null = null;
    if (avatar) {
      avatarDataUri = await imageToDataUri(avatar);
    }

    const width = 1200;
    const height = 630;
    const dn = xmlEscape(displayName || username);
    const un = xmlEscape(username);
    const showUsername = displayName && displayName !== username;

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a1a"/>
      <stop offset="50%" style="stop-color:#2d2d2d"/>
      <stop offset="100%" style="stop-color:#1a1a1a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#D4AF37"/>
      <stop offset="100%" style="stop-color:#F7E06C"/>
    </linearGradient>
    <clipPath id="avatarClip"><circle cx="600" cy="250" r="100"/></clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${banner ? `<image href="${xmlEscape(banner)}" x="0" y="0" width="${width}" height="300" preserveAspectRatio="xMidYMid slice" opacity="0.4"/><rect x="0" y="0" width="${width}" height="300" fill="url(#bg)" opacity="0.6"/>` : ''}
  ${avatarDataUri
    ? `<g>
        <circle cx="600" cy="250" r="110" fill="url(#gold)" opacity="0.3"/>
        <circle cx="600" cy="250" r="105" fill="#D4AF37" opacity="0.5"/>
        <image href="${avatarDataUri}" x="500" y="150" width="200" height="200" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>
        <circle cx="600" cy="250" r="100" fill="none" stroke="url(#gold)" stroke-width="4"/>
      </g>`
    : `<circle cx="600" cy="250" r="100" fill="#2d2d2d"/>
       <circle cx="600" cy="250" r="100" fill="none" stroke="url(#gold)" stroke-width="4"/>
       <text x="600" y="280" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#D4AF37" text-anchor="middle">${(displayName || username).charAt(0).toUpperCase()}</text>`}
  <text x="600" y="420" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">${dn}</text>
  ${showUsername ? `<text x="600" y="470" font-family="monospace" font-size="28" fill="#D4AF37" text-anchor="middle">${un}</text>` : ''}
  <g transform="translate(40, 550)">
    <path d="M 0 0 L 20 60 L 40 0 L 35 0 L 20 45 L 5 0 Z" fill="#D4AF37"/>
    <text x="50" y="45" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#D4AF37">VANITY.BOX</text>
  </g>
</svg>`;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
