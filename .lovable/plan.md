# Plan: 5 Fixes

## 1. Activity/NFT loading speed for raw wallet addresses
Investigate `useProfileResolver`, NFT fetch hooks. Add parallel fetching and avoid blocking on slow APIs. For raw wallet searches, kick off NFT/activity fetches immediately in parallel rather than sequentially after profile resolution.

## 2. Passkey IOTA wallets — IPFS profile data display
Verify that on passkey login (no `.iota` name yet), the profile loader still attempts reverse-lookup → IPFS profile fetch. Currently passkey addresses likely render a stub profile. Fix: on passkey session, run reverse lookup of address → `.iota` name → fetch IPFS notarized profile (avatar, bio, social, header).

## 3. NFT Detail Modal UI (image attached)
Current: blank blue background dominates, title overlaps the in-image text awkwardly, button bar feels detached. Improvements:
- Constrain image area to a clean square aspect with rounded top
- Move title/chain info into a clean panel below the image with proper spacing
- Add subtle gradient over image bottom so title overlay never collides
- Keep gold "View on OpenSea" CTA but tighten paddings, add description/owner row if available
- Mobile-first: full-width with safe-area padding

## 4. Copy address → "Copied" toast
Audit clickable address spots (ProfileCard, NFT modal owner, Header connected button, Messages thread address). Replace silent `navigator.clipboard.writeText` with a helper that also fires `toast({ description: 'Copied' })` from `useToast` / sonner.

## 5. Domain avatars for UD across UNS/CNS (ETH/Polygon/Base) + UD Profile API enrichment
In `resolve-ud-opensea` edge function, also extract `display_image_url` / `image_url` from the OpenSea NFT response and return it. Then in `useProfileResolver.resolveUdProfile`, merge: prefer UD Profile API avatar, fall back to OpenSea image. Also enrich UD NFT collection rendering to use OpenSea image directly so avatars show for all chains.

## Technical notes
- Files: `src/hooks/useProfileResolver.ts`, `src/components/NFTDetailModal.tsx`, `src/components/ProfileCard.tsx`, `src/components/Header.tsx`, `src/components/WalletConnection.tsx`, `src/pages/Messages.tsx`, `supabase/functions/resolve-ud-opensea/index.ts`, possibly UD NFT fetch edge function.
- Reuse existing `useToast` hook for copy notifications.
- For #1, ensure NFT/token hooks fire as soon as an address is known, not gated on profile API completion.
- For #2, leverage existing IOTA reverse-lookup (`useProfileResolver` already has this for passkey sessions per memory) — confirm IPFS profile fetch is wired.

No business logic changes outside data plumbing required by these fixes.