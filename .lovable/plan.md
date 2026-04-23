

## Goal
Fix three issues affecting cross-chain profile completeness and reputation UX:
1. IOTA Names NFT collection missing on cross-chain (e.g. `.eth` → linked `vanity.iota`) views.
2. Unstoppable Domains badges not fetching/displaying.
3. Reputation modal styled inconsistently with NFT window, internal scrolling for Polymarket, leftover Settings icon, and raw wallet/blank avatar instead of domain identity.

## Root causes identified

**1. IOTA Names NFTs missing on cross-chain overlay**
On the overlay path (`SearchInterface.tsx` ~1564), we call `setDisplayQuery(iotaName)` but **do not** route the IOTA wallet address to `ProfileCard.currentWalletAddress`. The IOTA NFT fetch (`get-iota-nfts`) runs only when `isIota && currentWalletAddress` is the IOTA address. In overlay mode, `currentWalletAddress` is still the EVM address, so `iotaNfts` (which contains the "IOTA Names" collection) never loads.

**2. UD badges not fetched**
- The fetcher in `ProfileCard.tsx` (~369) keys off `searchedIdentity || web3BioProfile?.identity`. After overlay activates, `searchedIdentity` becomes the `.iota` name → `.iota` is not in `UD_TLDS` → fetch never fires.
- For non-overlay UD lookups (e.g. `finesser.x`), the UD public API returns `404 "domain owner address not found"` for many domains, so `badges:[]` is returned silently. We need a fallback to fetch via the resolved owner address (`/profile/public/{address}/badges`), which UD's API also accepts.
- Direct preview test confirms `sandy.x` returns badges, `finesser.x` returns 404 — so the address-based fallback is required.

**3. Reputation modal UX**
- Currently styled as a compact dialog with chevron rows — inconsistent with the rounded NFT window's look (sticky header, large hero, gold borders, square modal w/o internal scroll lists).
- `PolymarketModal` has internal `overflow-y-auto` on positions list (line 350) and a Settings button (line 124–131).
- `PolymarketModal` shows `data.profile.displayName` which falls back to the raw 0x address, and avatar is empty when UD/PM doesn't return one — we have the searched domain identity + avatar already in `ProfileCard`, just not passed through.

## Implementation plan

### Edit `src/components/SearchInterface.tsx`
- In the cross-chain overlay block (~1564), after resolving `iotaName`, derive the owner IOTA address (it's already returned by `fetchIotaOnchainProfile` as `ownerAddress` and by `resolve-iota-domain`). Pipe that into a new state `overlayIotaAddress` and forward it to `ProfileCard` as the **effective wallet** for IOTA-side fetches (tokens, NFTs, transactions). Pass it via a new prop `iotaOwnerAddressForFetch` so we don't disturb the existing `currentWalletAddress` (kept as the EVM source for cross-chain EVM tokens/EFP).

### Edit `src/components/ProfileCard.tsx`
- Accept the new prop `iotaOwnerAddressForFetch` and use it instead of `currentWalletAddress` inside the `if (isIota)` block (lines 1241–1307) when present. This guarantees `get-iota-nfts` is called with the IOTA wallet on overlay, restoring the **IOTA Names** collection group.
- **UD badges fetcher (lines 369–394)**:
  - Build the candidate identity list from `[ensOverlay/originalSearchedIdentity, web3BioProfile?.identity, searchedIdentity]` so the **original UD-style** identity is tried first (covers overlay swap to `.iota`).
  - If domain-based fetch returns `[]` or 404 reason, fall back to address-based: POST `{ address: currentWalletAddress }` to `get-ud-badges`.
  - Reset `udBadgesFetched` when identity changes.
- **Wire reputation modal data**: pass `displayIdentity` (the active overlay identity = ENS/UD name) and `displayAvatar` (from web3Bio/overlay) into `ReputationModal` and `PolymarketModal` so the rendered profile uses the domain name + avatar, never the raw 0x.

### Edit `supabase/functions/get-ud-badges/index.ts`
- Accept either `{ domain }` or `{ address }`. When `address` is provided, hit `https://api.unstoppabledomains.com/profile/public/{address}/badges` (UD supports both).
- Keep graceful 200-with-`{badges:[]}` on upstream errors (per stack-overflow knowledge: never 500 on third-party failure).

### Rewrite `src/components/ReputationModal.tsx` to match NFT window
- Sticky rounded header with gold border (mirrors `PolymarketModal` shell), no internal scrollable sublists.
- Hero section: domain avatar (use passed `avatarUrl`, fallback to `vanity-box-default-avatar.png`) + domain name (passed `identity`) + small subtitle (e.g. badge count).
- Sections rendered as full-width cards (not chevron rows): "Talent Protocol" card with score chips, "Polymarket" card with stat chips, "Unstoppable Badges" responsive grid (3-col mobile, 4-col desktop) styled like NFT collection tiles — square gold-bordered tiles with rounded image and name underneath.
- Tapping Talent or Polymarket card opens the existing modals.
- Add new props: `identity?: string`, `avatarUrl?: string | null`.

### Edit `src/components/PolymarketModal.tsx`
- Remove the Settings button entirely (and the `showSettings` panel + state).
- Remove `max-h-48 overflow-y-auto` from the open positions list (no inner scroll). Wrap entire DialogContent so the dialog itself scrolls (already `overflow-y-auto` on `DialogContent`).
- Accept new props `displayIdentity?: string` and `displayAvatar?: string | null`. Use these in the profile header instead of raw wallet/blank avatar. Keep `data.profile.joinedDate` underneath.

### Optional polish
- In `ReputationModal` and `PolymarketModal`, add `aria-describedby`/`DialogDescription` to silence the existing Radix warning seen in console logs.

## Files touched
- `src/components/SearchInterface.tsx` — pass IOTA owner address to ProfileCard for overlay fetches.
- `src/components/ProfileCard.tsx` — use overlay IOTA address for IOTA NFT fetch; fix UD badges fetch to use original identity + address fallback; pass identity/avatar to reputation/polymarket modals.
- `supabase/functions/get-ud-badges/index.ts` — accept `address` and call address endpoint as fallback.
- `src/components/ReputationModal.tsx` — restyled to mirror NFT window.
- `src/components/PolymarketModal.tsx` — remove Settings, remove inner scroll, accept domain identity + avatar.

## Expected outcome
- Searching a `.eth`/`.x`/`.crypto`/`.vanity` linked to a `vanity.iota` shows the **IOTA Names** NFT collection alongside other categories.
- UD badges populate for overlay searches and direct UD lookups (with address fallback when domain endpoint 404s), making the **Reputation** button visible whenever data exists.
- Reputation window matches NFT window aesthetics, has no internal scroll for Polymarket, no Settings cog, and shows the **domain name + avatar** instead of the raw 0x address.

