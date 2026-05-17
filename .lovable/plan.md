## 1. Hide Presentation + Verify steps (Identity panel)

`src/components/identity/IdentityPanel.tsx`
- Remove Step 3 (Create Presentation) and Step 4 (Verify) rows from the UI
- Remove progress dots 3 + 4 (only DID + VC visible)
- Strip `handleCreatePresentation`, `handleVerify`, `PresentationModal` mount, related state
- Remove `onPresentCredential` button from `CredentialList` (no longer surface "Present")
- Keep underlying context methods (other code paths may still use them) but no UI entrypoints

## 2. Manual (unverified) wallet linking — multi-wallet per chain

### Storage
New localStorage layer keyed per `iotaName`:
```
vanity_unverified_wallets:<iotaName> = {
  ethereum: string[], ton: string[], aptos: string[], sui: string[]
}
```
Also tracked: verified wallets already come from `vcList` (multiple VCs of same type already supported — we'll just stop deduping).

New hook: `src/hooks/useLinkedWallets.ts`
- Returns `{ verified: {chain, address}[], unverified: {chain, address}[], isVerified(address) }`
- Merges VC-issued addresses + localStorage unverified list

### UI — Identity panel wallet sections
For each chain section (ETH/TON/Aptos/Sui):
- Existing "Link Wallet" CTA stays (verified path)
- Add secondary CTA: "Add address manually" → opens small modal with address input + chain validation
- Linked list now shows ALL wallets (multiple verified VCs + unverified) with badges:
  - Verified: existing green ShieldCheck badge
  - Unverified: amber `AlertTriangle` badge clickable → opens info popover
- Each entry has its own unlink/remove control
- Remove existing single-wallet guards that block adding a second VC

New component: `src/components/UnverifiedBadge.tsx`
- Amber pill "Unverified" with tooltip + click → Dialog explaining "This wallet address was added manually. We have NOT verified ownership because it was not authenticated by connecting and signing with the wallet. Data shown for this address may not represent the profile owner."

### Data-source plumbing (badges in profile UI)
Touch points (provenance: which wallet each item came from):
- Tokens: `src/components/ProfileCard.tsx` token renderer — add small `Unverified` chip next to items whose source wallet is in unverified set
- NFTs: NFT grid renderer — same chip overlay on tile corner
- Activity: transaction list rows — chip in row metadata
- Social links (EFP / Farcaster / Talent / etc.): SocialIcon row — chip on card
- Reputation (Talent, POAPs): ReputationModal / TalentProtocolCard — chip in header

Strategy to avoid touching 20 fetch hooks:
- All cross-chain data hooks already accept an address. Change `useProfileResolver` (or the profile assembly layer) to fetch the union of `verified ∪ unverified` addresses, tag each result with `__sourceAddress` + `__verified: boolean`, then merge.
- Renderers read `item.__verified` and render `<UnverifiedBadge />` when false.

I'll do this iteratively per data source — first tokens (most-requested), then NFTs, then activity/social/reputation in a second pass. Plan flags this so user knows pass 1 ≠ all sources.

## 3. Edit-Profile modal: container-bound + i18n

`src/components/IotaProfileEditModal.tsx`
- Replace full-viewport `Dialog` with positioning constrained to the profile container (same approach as NFT modal — absolute inside ProfileCard's `relative` wrapper, respects gold side borders)
- Wrap every user-facing string in `t()` via existing `LanguageContext`
- Add translation keys to language files for all labels/placeholders/buttons/section titles

## 4. Order of work in this loop

1. Hide VP/Verify (small, isolated)
2. Edit modal container + i18n (medium, contained to one component)
3. Unverified wallet linking — Identity panel + UnverifiedBadge + localStorage + tokens pass (the largest change)

Activity/Social/Reputation badge plumbing will be flagged as a follow-up pass after pass 1 ships and you confirm the visual treatment.

## Files to create
- `src/components/UnverifiedBadge.tsx`
- `src/hooks/useLinkedWallets.ts`
- `src/components/AddUnverifiedWalletModal.tsx`

## Files to edit (pass 1)
- `src/components/identity/IdentityPanel.tsx` (hide VP/Verify, add manual-add CTAs, allow multi-VC)
- `src/components/identity/CredentialList.tsx` (drop Present button)
- `src/components/IotaProfileEditModal.tsx` (container + i18n)
- `src/contexts/LanguageContext.tsx` + locale files (new keys)
- `src/components/ProfileCard.tsx` (token badge rendering, manual-wallet fetch merging)
- Possibly `src/hooks/useProfileResolver.ts` (merge unverified addresses into asset fetches)
