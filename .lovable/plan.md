

## Problem

The `create-vanity-box-redirect` function creates a Page Rule that only matches `{name}.vanity.box/*`. When someone visits `www.{name}.vanity.box`, the DNS resolves (via the www CNAME), but there's **no Page Rule** to redirect that traffic — so Cloudflare serves nothing useful.

## Fix

In `supabase/functions/create-vanity-box-redirect/index.ts`, add a **second Page Rule** (or modify the existing one) to also redirect `www.{name}.vanity.box/*` → `https://vanity.box/{name}.vanity.iota`.

### Changes to `create-vanity-box-redirect/index.ts`

After the existing page rule creation (line ~166), add a second page rule:

```typescript
// Step 2b: Create page rule for www variant
const wwwPageRuleResponse = await fetch(
  `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/pagerules`,
  {
    method: "POST",
    headers: cfHeaders,
    body: JSON.stringify({
      targets: [{
        target: "url",
        constraint: {
          operator: "matches",
          value: `www.${cleanSubdomain}.vanity.box/*`,
        },
      }],
      actions: [{
        id: "forwarding_url",
        value: {
          url: `https://vanity.box/${cleanSubdomain}.vanity.iota`,
          status_code: 301,
        },
      }],
      priority: 1,
      status: "active",
    }),
  }
);
```

**Note:** Cloudflare Free plans have a **3 Page Rule limit**. If you're already at the limit, this approach won't scale. In that case, the alternative is to use a **single wildcard Page Rule** like `www.*.vanity.box/*` → redirect, or switch to **Cloudflare Bulk Redirects** (free, up to 20 lists of 500 rules each), or handle the redirect at the application/worker level.

### Recommended approach: Cloudflare Worker (most scalable)

Instead of per-name Page Rules (which have hard limits), create a single **Cloudflare Worker** or use the existing wildcard DNS + a catch-all redirect rule:

1. Add one Page Rule: `www.*.vanity.box/*` → `https://$1.vanity.box/$2` (strips www)
2. The existing `*.vanity.box/*` rule then handles the redirect

However — `www.*.vanity.box` is a double-wildcard which may not work in Page Rules on Free plans.

**Simplest fix**: Update the existing Page Rule pattern from `${name}.vanity.box/*` to also handle the www case by creating a second rule per domain, **and** run a one-time backfill for existing domains.

### Also needed: backfill existing domains

Call `sync-vanity-dns` with a new action to create www Page Rules for all ~118 existing names that are missing them.

### Summary of work
1. Add www Page Rule creation in `create-vanity-box-redirect` (for new purchases)
2. Add www Page Rule backfill in `sync-vanity-dns` (for existing names)
3. Deploy both functions
4. Test with `www.ava.vanity.box`

