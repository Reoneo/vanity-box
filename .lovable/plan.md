

User wants:
1. Click header logo to trigger a sync (Dune → Cloudflare DNS/redirects/www CNAMEs).
2. Know if there's a Cloudflare limit on how many they can add.

Looking at Header.tsx and sync-vanity-dns to plan minimally.

## Plan

### 1. Make header logo click trigger sync
In `src/components/Header.tsx`, wrap the V wallet logo in a button (or add onClick to the existing logo element). On click:
- Call `sync-vanity-dns` edge function with `{ action: "sync-quick" }` (lightweight: Dune fetch + DNS CNAMEs + www CNAMEs + Total TLS check).
- Show toast feedback: "Syncing…" → "Synced N names (X new www records)" or error.
- Throttle: skip if last manual click was <30s ago (prevent accidental double-clicks). Different from the existing 6h auto-throttle in Index.tsx — manual click should bypass that.
- Optional: hold Shift+click for full `action: "sync"` (re-deploys Worker + everything). Keep simple — just use `sync-quick` for now.

### 2. Cloudflare limits (answer in chat after approval)
- **DNS records**: Free/Pro/Biz/Enterprise all allow effectively unlimited records per zone (soft cap ~3,500 proxied; thousands of unproxied). 136 names × 2 (apex + www) = 272 records — well within limits.
- **Total TLS / Advanced Certificate Manager**: ACM cert pack covers up to 100 hostnames per pack; Cloudflare auto-creates additional packs as needed. Effectively unlimited for our scale.
- **Page Rules**: Free = 3, Pro = 20. We are NOT using per-name Page Rules — we use a single Worker route `*.vanity.box/*`, so this limit doesn't apply.
- **Workers requests**: Free = 100k req/day, Paid = 10M included. Plenty of headroom.
- **Bottom line**: No practical limit at our scale. Safe to keep adding.

### Files to change
- `src/components/Header.tsx` — add onClick on logo, useState for syncing, useToast feedback.

That's it — minimal, single-file change.

