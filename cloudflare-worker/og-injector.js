/**
 * Vanity.box OG Meta Injector + Wildcard Subdomain Handler — Cloudflare Worker
 *
 * Routes bound (see wrangler.toml):
 *   - vanity.box/*
 *   - www.vanity.box/*
 *   - *.vanity.box/*   (wildcard, used for Bluesky handles)
 *
 * Two responsibilities:
 *   1. Apex/www: for social-preview crawlers, rewrite index.html to inject
 *      per-profile OG/twitter tags so https://vanity.box/<name> previews
 *      with the correct avatar.
 *   2. Wildcard <sub>.vanity.box:
 *      a. /.well-known/atproto-did → serve plain-text DID for that vanity
 *         (apex DID is hard-coded; subdomain DIDs come from Supabase).
 *      b. Any other path → fetch the SPA shell from https://vanity.box/ and
 *         pass it through so the SPA's wildcard host hook redirects to
 *         /<sub>.vanity and loads the profile.
 */

const SUPABASE_PROJECT = "gdjjboorqviobvvygpca";
const SUPABASE_OG_BASE = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/og-image`;
const SUPABASE_BLUESKY_GET = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/get-bluesky-did`;

const CRAWLER_REGEX = /(twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|skypeuripreview|pinterest|redditbot|applebot|vkshare|w3c_validator|bingpreview|yandexbot|googlebot|google-inspectiontool|baiduspider|duckduckbot|mj12bot|embedly|nuzzel|outbrain|quora link preview|showyoubot|tumblr|bitlybot|flipboard|qwantify|chatgpt-user|gptbot|perplexitybot|claudebot|imessagebot|signal)/i;

const RESERVED_PATHS = new Set([
  '', 'messages', 'privacy', 'terms', 'profile', 'settings',
  'identity', 'subdomain', 'ud-redirect', 'redirect', 'about',
]);

const STATIC_EXT_REGEX = /\.(?:js|mjs|css|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|map|json|xml|txt|wasm|mp4|webm|pdf)(?:\?.*)?$/i;

const APEX_HOSTS = new Set(["vanity.box", "www.vanity.box"]);

// Hard-coded DID for the apex vanity.box handle (the project owner).
const APEX_ATPROTO_DID = "did:plc:bqycbmr2vb3cx5r7i5nr46fl";

function isProfilePath(pathname) {
  if (!pathname || pathname === '/') return false;
  if (STATIC_EXT_REGEX.test(pathname)) return false;
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length !== 1) return false;
  const seg = segs[0].toLowerCase();
  if (RESERVED_PATHS.has(seg)) return false;
  return true;
}

function titleCase(name) {
  return name
    .split('.')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join('.');
}

function parseSubdomain(host) {
  const h = (host || "").toLowerCase();
  if (APEX_HOSTS.has(h)) return null;
  const m = h.match(/^([a-z0-9-]+)\.vanity\.box$/);
  if (!m) return null;
  if (m[1] === "www") return null;
  return m[1];
}

async function fetchSubdomainDid(sub) {
  const vanityName = `${sub}.vanity`;
  const url = `${SUPABASE_BLUESKY_GET}?vanityName=${encodeURIComponent(vanityName)}`;
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.did === "string" && j.did ? j.did : null;
  } catch {
    return null;
  }
}

async function rewriteCrawler(originResponse, requestUrl, username) {
  const display = titleCase(username);
  const canonical = `https://vanity.box/${username}`;
  const ogImage = `${SUPABASE_OG_BASE}?username=${encodeURIComponent(username)}&displayName=${encodeURIComponent(display)}`;
  const title = `${display} - Vanity.box`;
  const desc = `View ${display}'s Web3 identity on Vanity.box`;

  const rewriter = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title); } })
    .on('meta[name="description"]', { element(el) { el.setAttribute('content', desc); } })
    .on('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]', {
      element(el) { el.remove(); },
    })
    .on('head', {
      element(el) {
        const tags = [
          `<meta property="og:type" content="profile" />`,
          `<meta property="og:title" content="${title}" />`,
          `<meta property="og:description" content="${desc}" />`,
          `<meta property="og:url" content="${canonical}" />`,
          `<meta property="og:image" content="${ogImage}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${title}" />`,
          `<meta name="twitter:description" content="${desc}" />`,
          `<meta name="twitter:image" content="${ogImage}" />`,
          `<link rel="canonical" href="${canonical}" />`,
        ].join('');
        el.append(tags, { html: true });
      },
    });

  return rewriter.transform(new Response(originResponse.body, {
    status: originResponse.status,
    headers: { ...Object.fromEntries(originResponse.headers), 'cache-control': 'public, max-age=300' },
  }));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const sub = parseSubdomain(host);

    // === Bluesky .well-known/atproto-did ===
    if (url.pathname === '/.well-known/atproto-did') {
      if (sub) {
        const did = await fetchSubdomainDid(sub);
        if (!did) {
          return new Response('not registered\n', {
            status: 404,
            headers: {
              'content-type': 'text/plain; charset=utf-8',
              'cache-control': 'public, max-age=30',
              'access-control-allow-origin': '*',
            },
          });
        }
        return new Response(did + '\n', {
          status: 200,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=60',
            'access-control-allow-origin': '*',
          },
        });
      }
      // Apex
      return new Response(APEX_ATPROTO_DID + '\n', {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=300',
          'access-control-allow-origin': '*',
        },
      });
    }

    // === Wildcard subdomain (non-.well-known) → serve SPA shell from apex ===
    if (sub) {
      // Always fetch the apex shell; SPA hook will redirect to /<sub>.vanity.
      const shellUrl = new URL("https://vanity.box/");
      const shellRequest = new Request(shellUrl.toString(), { headers: request.headers, method: "GET" });
      const originResponse = await fetch(shellRequest);
      const ct = originResponse.headers.get('content-type') || '';
      if (!ct.includes('text/html')) return originResponse;

      const ua = request.headers.get('user-agent') || '';
      if (CRAWLER_REGEX.test(ua)) {
        return rewriteCrawler(originResponse, url, `${sub}.vanity`);
      }
      return new Response(originResponse.body, {
        status: originResponse.status,
        headers: {
          ...Object.fromEntries(originResponse.headers),
          'cache-control': 'public, max-age=60',
        },
      });
    }

    // === Apex/www: original behavior ===
    const isProfile = isProfilePath(url.pathname);
    if (!isProfile) return fetch(request);

    const shellUrl = new URL(request.url);
    shellUrl.pathname = '/';
    shellUrl.search = '';
    const shellRequest = new Request(shellUrl.toString(), request);
    const originResponse = await fetch(shellRequest);
    const ct = originResponse.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return originResponse;

    const ua = request.headers.get('user-agent') || '';
    if (!CRAWLER_REGEX.test(ua)) {
      return new Response(originResponse.body, {
        status: originResponse.status,
        headers: { ...Object.fromEntries(originResponse.headers), 'cache-control': 'public, max-age=60' },
      });
    }

    const username = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0]);
    return rewriteCrawler(originResponse, url, username);
  },
};
