## The real problem

Currently the share link includes `?avatar=...` because that's the only way the OG image edge function knows which avatar to render. The OG meta tags themselves are injected by `react-helmet-async` (`DynamicMetaTags.tsx`), which runs **client-side after JavaScript executes**.

Social-preview crawlers (X/Twitter, iMessage, Facebook, LinkedIn, Discord, Telegram, WhatsApp, Slack) **do not execute JavaScript**. They fetch the raw HTML at `vanity.box/smith.box` and see only the static tags in `index.html` — which point at the generic `vanity-meta-image.jpeg`. That is why your preview falls back to the brand image no matter what Helmet does.

The sites that "manage to do it" all do one of two things:
1. Server-side render the per-profile HTML (Next.js, Remix, etc.)
2. Sit behind an edge worker (Cloudflare Worker / Vercel edge) that detects crawler User-Agents and rewrites the `<meta>` tags before responding

We're on Vite + React SPA, so option 1 isn't available without a stack change. Option 2 is — and the project already has `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, and `CLOUDFLARE_ACCOUNT_ID` secrets, meaning `vanity.box` is on Cloudflare.

## Plan

### 1. Make the OG edge function self-sufficient
Update `supabase/functions/og-image/index.ts` so it can be called with just `?username=smith.box` and resolves the avatar itself server-side (Web3.bio for `.eth`/`.box`/etc., IOTA indexer for `.iota`, UD API for `.vanity` / UD TLDs — mirroring the resolution logic already in `useProfileResolver`). Cache the rendered SVG for ~1h. This removes the need for `?avatar=...` in the share URL entirely.

### 2. Deploy a Cloudflare Worker for OG injection
Create a Worker bound to `vanity.box/*` that:
- Inspects `User-Agent`. If it matches a known social-preview crawler (Twitterbot, facebookexternalhit, LinkedInBot, Slackbot, Discordbot, TelegramBot, WhatsApp, Bingbot preview, Google snippet, iMessage/AppleBot, etc.), AND the path looks like a profile (`/<name>` with no static-asset extension), it:
  1. Fetches the original `index.html` from the Lovable origin
  2. Rewrites/injects per-profile `<title>`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:*`, and `canonical` — `og:image` points at the edge function from step 1 with just `?username=<name>`
  3. Returns the modified HTML
- For non-crawlers, passes the request straight through to the origin unchanged (no perf hit for users, SPA still works exactly as today).

The Worker uses `HTMLRewriter` (native to Cloudflare Workers) so it's fast and streaming. No avatar fetching in the Worker itself — the OG image URL handles that lazily when the crawler requests the image.

### 3. Simplify the in-app share handler
In `src/components/ProfileCard.tsx` `handleShareProfile`, drop the `?avatar=...` query string. The share URL becomes exactly `https://vanity.box/<identifier>`. Keep the `navigator.share({ files })` avatar-as-file fallback for native mobile share sheets (that's a separate UX win and not what crawlers use).

### 4. Clean up `DynamicMetaTags.tsx`
Stop appending `&avatar=...&banner=...` to the og-image URL — call it with just `?username=...&displayName=...`. The function resolves the rest. This keeps the client-side Helmet behavior aligned with the Worker's crawler output so JS-executing crawlers (Googlebot) and non-JS crawlers see the same image.

### Technical details

**Files touched in the repo:**
- `supabase/functions/og-image/index.ts` — add server-side avatar resolution by username (Web3.bio + IOTA indexer + UD API), keep existing SVG renderer
- `src/components/ProfileCard.tsx` — remove `?avatar=` from `handleShareProfile`'s `url`
- `src/components/DynamicMetaTags.tsx` — stop forwarding `avatar`/`banner` to the og-image URL

**Cloudflare Worker (new, deployed separately via Cloudflare API using the existing secrets):**
- Single `fetch` handler, crawler UA regex, `HTMLRewriter` to swap meta tags, route bound to `vanity.box/*` and `www.vanity.box/*`
- Excludes paths with file extensions (`.js`, `.css`, `.png`, `.svg`, `.ico`, etc.) and reserved routes (`/messages`, `/privacy`, `/terms`, etc.) so it only acts on profile URLs

### What this does NOT do
- It does not change the SPA's runtime behavior for real users
- It does not require migrating off Vite/React
- It does not break existing `?avatar=` links — the param is just ignored

### One decision needed from you
The Cloudflare Worker needs to be deployed to your Cloudflare account. I can:
- **(a)** Write the Worker source + a deploy script that uses your existing `CLOUDFLARE_*` secrets and run it from an edge function, or
- **(b)** Give you the Worker code and one-line `wrangler deploy` command for you to run locally

Tell me which you prefer and I'll implement.