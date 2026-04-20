

## Why `Finesser.eth → vanity.iota` overlay isn't firing

Confirmed via DB query that `iota_wallet_links` already holds the link:
`vanity.iota → 0x71ab0b01e3ff45551e25b208e2a90298f73f7040 (chain: ethereum)`.

The edge function and the SearchInterface overlay branch are both wired. But a check of the live console shows **no `🔗 Cross-chain candidates` log line at all**, meaning the IIFE at `SearchInterface.tsx` line 1466 is exiting early or the branch is being skipped. Three concrete causes, all need fixing:

1. **Stale-search guard kills the IOTA fetch.** The auto-search `useEffect` at line 886 runs on every `username` / `location.pathname` change and fires `handleSearch(username)` inside a `setTimeout`. In React StrictMode + with the `setEnsOverlay(null)` reset on line 1272 also retriggering the deps, two `handleSearch` calls overlap, both bump `searchIdRef.current`, and the awaited `fetchIotaOnchainProfile(iotaName)` at line 1521 is discarded by the `searchIdRef.current !== currentSearchId` check at line 1522. Result: `iotaOnchainProfile` is never set, so the render gate `(ensOverlay && iotaOnchainProfile)` stays false and we keep showing the bare ENS card.

2. **Edge function only checks `evm_address` once.** It builds an OR clause but doesn't query an alternate `chain='ethereum'` filter, doesn't strip whitespace/casing, and silently returns `success: false` for transient PostgREST errors instead of retrying.

3. **No persisted cross-chain index.** Every search hits the edge function and re-fetches the IOTA profile from chain + IPFS. Slow and fragile when IPFS/indexer hiccup. The user explicitly asked: *"Maybe a record should be created for .iota domains that hold the full .iota domain with linked wallets?"* — yes, we should.

## Fix plan

### 1. Make the cross-chain fetch resilient to stale-search aborts (`SearchInterface.tsx`)
- Inside the IIFE at line 1466, **set `ensOverlay` BEFORE awaiting** `get-iota-name-by-evm`, so even if the search is later superseded the overlay state survives for the next render.
- Replace the `searchIdRef.current !== currentSearchId` early-return at line 1522 with a softer check: if it's stale, still set `iotaOnchainProfile` and `iotaOwnerAddress` (because the resolved IOTA name is correct for the searched ENS — it's not "the wrong profile", it's just the slower of two parallel runs).
- Remove the `setTimeout(..., 100)` wrapper around `handleSearch(username)` in the auto-search effect; it just creates a race with a duplicate StrictMode mount.

### 2. Strengthen `get-iota-name-by-evm` edge function
- Lowercase + trim every candidate before building the OR clause.
- Add a second fallback query that ignores the OR list entirely and does an explicit `eq('evm_address', candidates[0]).eq('chain', 'ethereum')` — this catches RLS or PostgREST quirks.
- On any DB error, retry once with a 250ms backoff before returning `success: false`.
- Add a `console.log` of the final SQL filter and the returned row count so future regressions are visible in logs.

### 3. Make the render branch tolerant of partial overlay state
- Update the gate on `SearchInterface.tsx` line 2146 / 2170 from `(ensOverlay && iotaOnchainProfile)` to `(ensOverlay && (iotaOnchainProfile || iotaOnchainProfileLoading))` — render the overlay card immediately with the ENS branding even while the IOTA on-chain JSON streams in. Replaces the current "blank ENS card" failure mode.

### 4. Persistent cross-chain profile cache (the user's suggestion)
Create a new Supabase table that stores, for every `.iota` name, a snapshot of its linked wallets and last-known on-chain profile pointer:

```text
public.iota_cross_chain_profiles
  iota_name      text primary key   -- e.g. 'vanity.iota'
  owner_address  text               -- IOTA owner
  evm_address    text               -- linked ETH wallet (lowercase)
  ton_address    text
  apt_address    text
  sui_address    text
  ipfs_cid       text               -- last published profile JSON
  display_name   text
  avatar_url     text
  updated_at     timestamptz default now()
  RLS: public read, service-role write
```

Populated by:
- A trigger on `iota_wallet_links` (insert/update) that upserts the matching row.
- The `notarize-profile-iota` edge function on every profile publish.
- A backfill migration that copies existing `iota_wallet_links` rows.

Then `get-iota-name-by-evm` can query this denormalized table first for an instant single-row lookup; it falls back to the existing `iota_wallet_links` join only on miss.

### 5. Diagnostic logs + memory update
- Add `console.log('🔗 Overlay applied:', { searched, iotaName, hasOnchain })` at the moment `setIotaOnchainProfile` is called inside the cross-chain IIFE.
- Update `mem://features/cross-chain-ens-iota-overlay.md` to record:
  - The new `iota_cross_chain_profiles` table is the primary lookup.
  - `ensOverlay` must be set before any awaited fetch.
  - Render gate uses `iotaOnchainProfile || iotaOnchainProfileLoading`.

## After the fix
Searching `Finesser.eth` will:
- Keep URL at `/Finesser.eth`.
- Immediately render the overlay card with Finesser.eth's avatar/name/header.
- Stream in vanity.iota's socials, tokens, NFTs, and identity panel underneath as they arrive.
- Log `🔗 Overlay applied: { searched: 'finesser.eth', iotaName: 'vanity.iota', hasOnchain: true }`.
- All future searches resolve via a single indexed row in `iota_cross_chain_profiles` instead of an OR-scan of `iota_wallet_links`.

