# Vanity.box OG Meta Injector (Cloudflare Worker)

This Worker fixes social-preview crawlers (X/Twitter, iMessage, Facebook,
LinkedIn, Slack, Discord, WhatsApp, Telegram, etc.) so that sharing
`https://vanity.box/smith.box` previews with the profile's actual avatar —
no `?avatar=` query string required.

## Why this exists

`vanity.box` is a Vite + React SPA. The per-profile `<meta property="og:*">`
tags are injected client-side by `react-helmet-async`. Social crawlers do
**not** execute JavaScript, so they only see the static tags in
`index.html`, which point at the generic brand image.

This Worker sits at the edge (Cloudflare, in front of the Lovable origin),
inspects the User-Agent, and — for crawlers only — rewrites `index.html`
on the fly to inject the right meta tags. Real users get the original
SPA passthrough with zero added latency.

## Deploying

### One-time setup

```bash
npm i -g wrangler        # Cloudflare CLI
wrangler login           # auth in your browser
```

### Deploy

From the `cloudflare-worker/` directory:

```bash
wrangler deploy
```

`wrangler.toml` already declares routes for `vanity.box/*` and
`www.vanity.box/*` so the Worker takes effect immediately after deploy.

### Verify

```bash
# As a real user — should return the SPA index.html unchanged
curl -sI https://vanity.box/smith.box

# As Twitterbot — should return HTML with og:image pointing at the og-image function
curl -s -H "User-Agent: Twitterbot/1.0" https://vanity.box/smith.box | grep og:image
```

Then paste a profile URL into:
- https://cards-dev.twitter.com/validator
- https://www.opengraph.xyz/url/https%3A%2F%2Fvanity.box%2Fsmith.box
- https://developers.facebook.com/tools/debug/

## Updating the crawler list

Edit `CRAWLER_REGEX` in `og-injector.js` and redeploy.

## Updating reserved paths

Edit `RESERVED_PATHS` in `og-injector.js` to exclude any new top-level
non-profile routes (e.g. `/messages`, `/privacy`).

## Wildcard subdomains (Bluesky handles)

`*.vanity.box` is now bound to the Worker as well so any `.vanity` owner
can use `<name>.vanity.box` as a Bluesky handle.

For this to work you need:

1. A **wildcard DNS record** in Cloudflare DNS for the zone:
   - Type: `CNAME`
   - Name: `*`
   - Target: `vanity.box`
   - Proxy status: **Proxied (orange cloud)** — required so the Worker can
     intercept the request and so Cloudflare terminates TLS for every
     subdomain (no per-name certificate needed).
2. Universal SSL with the **"Always Use HTTPS"** + wildcard certificate
   enabled (default on Cloudflare).
3. Redeploy the Worker (`wrangler deploy`) after editing `wrangler.toml` so
   the new `*.vanity.box/*` route is picked up.

The Worker then:
- Serves `https://<sub>.vanity.box/.well-known/atproto-did` as plain text
  by calling the public `get-bluesky-did` Supabase function.
- Returns the apex SPA shell for any other path on `<sub>.vanity.box`. The
  SPA's `main.tsx` then redirects to `vanity.box/<sub>.vanity` so the
  matching profile loads.
