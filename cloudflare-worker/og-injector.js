/**
 * Vanity.box OG Meta Injector — Cloudflare Worker
 *
 * Bound to vanity.box/* and www.vanity.box/*.
 *
 * For social-preview crawlers (no JS), rewrites the static index.html and
 * injects per-profile <title>, og:*, twitter:*, and canonical tags so that
 * https://vanity.box/<name> previews with the correct avatar.
 *
 * Real users pass through unchanged — the SPA loads exactly as before.
 */

const SUPABASE_OG_BASE = 'https://gdjjboorqviobvvygpca.supabase.co/functions/v1/og-image';

const CRAWLER_REGEX = /(twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|skypeuripreview|pinterest|redditbot|applebot|vkshare|w3c_validator|bingpreview|yandexbot|googlebot|google-inspectiontool|baiduspider|duckduckbot|mj12bot|embedly|nuzzel|outbrain|quora link preview|showyoubot|tumblr|bitlybot|flipboard|qwantify|chatgpt-user|gptbot|perplexitybot|claudebot|imessagebot|signal)/i;

const RESERVED_PATHS = new Set([
  '', 'messages', 'privacy', 'terms', 'profile', 'settings',
  'identity', 'subdomain', 'ud-redirect', 'redirect', 'about',
]);

const STATIC_EXT_REGEX = /\.(?:js|mjs|css|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|map|json|xml|txt|wasm|mp4|webm|pdf)(?:\?.*)?$/i;

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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get('user-agent') || '';
    const isCrawler = CRAWLER_REGEX.test(ua);

    // Pass through real users and non-profile paths instantly.
    if (!isCrawler || !isProfilePath(url.pathname)) {
      return fetch(request);
    }

    const username = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0]);
    const display = titleCase(username);
    const canonical = `https://vanity.box/${username}`;
    const ogImage = `${SUPABASE_OG_BASE}?username=${encodeURIComponent(username)}&displayName=${encodeURIComponent(display)}`;
    const title = `${display} - Vanity.box`;
    const desc = `View ${display}'s Web3 identity on Vanity.box`;

    const originResponse = await fetch(request);
    const ct = originResponse.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return originResponse;

    const rewriter = new HTMLRewriter()
      .on('title', {
        element(el) { el.setInnerContent(title); },
      })
      .on('meta[name="description"]', {
        element(el) { el.setAttribute('content', desc); },
      })
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

    return rewriter.transform(
      new Response(originResponse.body, {
        status: originResponse.status,
        headers: { ...Object.fromEntries(originResponse.headers), 'cache-control': 'public, max-age=300' },
      }),
    );
  },
};
