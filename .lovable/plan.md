# SEO Score Fixes — index.html only

All changes target `index.html` and remain invisible to users via the existing `.seo-only` utility class. No visual or behavioural changes.

## Issues addressed

1. **H1 missing** — already present inside `.seo-only`, but auditors sometimes flag it because it sits inside an `aria-hidden` block. Move the heading hierarchy outside `aria-hidden` (still visually hidden via `.seo-only`) so crawlers and SEO bots count it cleanly.
2. **Good headings on the page** — restructure to a proper outline: one `H1`, then sequential `H2` → `H3` (drop the orphan `H4`, no skipped levels).
3. **Few internal links** — add a hidden `<nav aria-label="Site">` block with internal anchors (`/`, `/messages`, `/privacy-policy`, `/terms-of-use`, plus a handful of popular profile/search routes that exist in the app) so crawlers see internal link signals. Hidden via `.seo-only`.
4. **Domain in title** — current `<title>` and `og:title` / `twitter:title` all start with `Vanity.box`. Rewrite them without the domain.
5. **Favicon markup** — already has `/favicon.ico` links, but add the standard fuller markup that SEO auditors check for: explicit `rel="icon" sizes="any"`, a PNG fallback (`/vanity-box-logo.png`), and keep the existing `apple-touch-icon`. Also add `<link rel="manifest">` reference only if a manifest exists — skipping since none is present.

## Specific edits

### Title + social titles (remove domain)
- `<title>Personalised Web3 Wallet Addresses & Blockchain Identity Names</title>`
- `og:title` and `twitter:title` updated to the same string.
- Keep `og:site_name` (add it) = `Vanity.box` so brand is still attributed without polluting the title tag.

### Favicon block (replace lines 11–12)
```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="icon" type="image/png" href="/vanity-box-logo.png" />
<link rel="apple-touch-icon" href="/vanity-box-logo.png" />
```
(Removes the duplicate apple-touch-icon line later in the file.)

### Headings + internal links (restructure `.seo-only` block)
- Remove `aria-hidden="true"` from the wrapper so headings/links are crawlable (still visually hidden via clip + off-screen positioning — zero visual impact).
- Outline:
  - `H1` Personalised Web3 Wallet Addresses & Blockchain Identity Names
  - `H2` Replace long crypto wallet addresses with one easy-to-read name
  - `H2` Supported blockchains and naming services
    - `H3` Ethereum, Base, IOTA, Aptos, TON, Sui, World Chain, Unstoppable Domains
  - `H2` Features
    - `H3` Cross-chain profiles, gasless onboarding, verified identity
  - `H2` Get started
- Add hidden internal nav:
```html
<nav aria-label="Primary">
  <a href="/">Home</a>
  <a href="/messages">Messages</a>
  <a href="/privacy-policy">Privacy Policy</a>
  <a href="/terms-of-use">Terms of Use</a>
</nav>
<nav aria-label="Explore">
  <a href="/vitalik.eth">Explore ENS profiles</a>
  <a href="/vanity.iota">Explore IOTA profiles</a>
  <a href="/jesse.base.eth">Explore Basenames</a>
  <a href="/sandy.ton">Explore TON profiles</a>
</nav>
```
(All routes already exist in `useProfileResolver` / `App.tsx`.)

## Files changed
- `index.html` (only)

## Verification
After changes: view-source confirms one H1, sequential H2/H3, ≥8 internal `<a href="/...">` links, `<title>` no longer contains "vanity.box", and 5 favicon link tags. Preview UI unchanged.
