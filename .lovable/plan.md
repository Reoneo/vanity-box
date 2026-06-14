# Bluesky Handles for All .vanity Domains

Let any `.vanity` owner use `<name>.vanity.box` as their Bluesky handle. Hitting `mrs.vanity.box` loads the `mrs.vanity` profile, and `https://mrs.vanity.box/.well-known/atproto-did` serves that owner's DID as plain text.

## 1. Database (Supabase)

New table `public.vanity_bluesky_handles`:
- `vanity_name` (text, PK) — e.g. `mrs.vanity`
- `subdomain` (text, unique) — e.g. `mrs` (derived)
- `did` (text) — `did:plc:...`
- `owner_eth_address` (text, lowercase)
- `owner_iota_address` (text, lowercase) — proves cross-chain link at save time
- `created_at`, `updated_at`

RLS:
- `SELECT` to `anon` and `authenticated` (worker reads with anon key; needed for `.well-known` lookup)
- `INSERT`/`UPDATE` only via edge function using service role (no direct client writes)

## 2. Edge function `save-bluesky-did`

Inputs: `vanityName`, `did`, `ethAddress`, `iotaAddress`, `signature` (over a message binding the three).

Server-side validation:
- Recover EVM signer from signature → must equal `ethAddress`
- Confirm `ethAddress` owns `vanityName` via existing `verify-vanity-ownership` logic
- Confirm `iotaAddress` ↔ `ethAddress` link exists in `iota_wallet_links`
- Validate `did` matches `^did:(plc|web|key):[a-z0-9._:-]+$`
- Upsert row keyed on `vanity_name`

Public companion `get-bluesky-did` (GET, `verify_jwt = false`): returns `{ did }` for a given `vanityName`. Used by the worker.

## 3. Cloudflare Worker (`cloudflare-worker/og-injector.js` + `wrangler.toml`)

- Add wildcard route: `*.vanity.box/*` (and keep apex/www routes).
- Host-aware logic:
  - If host = `<sub>.vanity.box` (sub ≠ `www`):
    - `/.well-known/atproto-did` → call `get-bluesky-did?vanityName=<sub>.vanity`. Return DID as `text/plain`, or 404 if not registered.
    - Any other path → fetch `https://vanity.box/<sub>.vanity` from origin (so the SPA loads that profile). Rewrite OG tags for crawlers the same way the apex worker already does.
  - Apex/www behavior unchanged (existing static DID stays for `vanity.box` itself).

User-side DNS (documented in `cloudflare-worker/README.md`): add `* CNAME vanity.box` (proxied) so the worker receives all subdomains. SSL via Cloudflare Universal — no per-subdomain cert needed because the worker terminates at the edge.

## 4. SPA wildcard host handling

In `src/main.tsx` (or a small `useHostProfileRedirect` hook mounted in `App.tsx`):
- On boot, read `window.location.host`. If it matches `^([^.]+)\.vanity\.box$` and the subdomain is not `www` and the path is `/`, replace state to `/<sub>.vanity` so `useProfileResolver` loads the profile.
- Keeps deep links working; no router changes needed.

## 5. UI: Bluesky button in NFT Detail Modal

In `src/components/NFTDetailModal.tsx`, when the NFT is a `.vanity` domain AND:
- the connected IOTA wallet's linked ETH address matches the NFT owner,

render a Bluesky icon button next to the OpenSea icon. Click opens a new lightweight `BlueskyHandleModal`:
- Pre-fills `<name>.vanity.box` (read-only) as the handle target
- DID text input (`did:plc:...`)
- Shows current DID if already set (fetched via `get-bluesky-did`)
- Save button → triggers EVM `personal_sign` over a deterministic message, then calls `save-bluesky-did`
- On success: toast with instructions to paste `<name>.vanity.box` into Bluesky's Change Handle screen and tap Verify.

A small `BlueskyIcon` SVG asset gets added under `src/assets/`.

## 6. Apex worker stays as-is

The existing hard-coded `ATPROTO_DID` for `vanity.box` itself remains so the owner's personal handle keeps working. New per-subdomain DIDs live in the DB.

## Technical notes

- Wildcard SSL: Cloudflare proxied wildcard CNAME gives free edge TLS — Lovable doesn't need to know about the subdomains.
- The worker becomes the source of truth for routing; Lovable origin only ever sees apex `vanity.box` requests.
- Avoid storing DID client-side or in localStorage — always read fresh from the edge function so Bluesky's re-verification always sees current state.
- Rate-limit `save-bluesky-did` (e.g. 5/min/ip) inside the function to deter spam.
- Signature message format: `Bind Bluesky handle\nvanity: <name>.vanity\ndid: <did>\nts: <unix>` — include timestamp, reject if older than 5 min (matches existing wallet signature policy).

## Files to touch

- `supabase/migrations/<new>.sql` (new table + RLS + grants)
- `supabase/functions/save-bluesky-did/index.ts` (new)
- `supabase/functions/get-bluesky-did/index.ts` (new, `verify_jwt = false`)
- `cloudflare-worker/og-injector.js` (host-aware routing + per-sub DID)
- `cloudflare-worker/wrangler.toml` (add `*.vanity.box/*` route)
- `cloudflare-worker/README.md` (document wildcard DNS step)
- `src/main.tsx` or new `src/hooks/useWildcardHostRedirect.ts`
- `src/components/NFTDetailModal.tsx` (Bluesky button gating)
- `src/components/BlueskyHandleModal.tsx` (new)
- `src/assets/bluesky-icon.svg` (new)

## Out of scope

- Bluesky OAuth / posting on behalf of the user
- DID:web hosting (only serving the user-supplied DID string)
- Editing the apex `vanity.box` DID via UI (still constant)
