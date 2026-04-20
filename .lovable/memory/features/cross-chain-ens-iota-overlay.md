---
name: Cross-chain ENS-to-IOTA overlay
description: Searching an ENS/EVM domain whose address is linked to a vanity.iota loads the IOTA profile but overlays the searched domain's avatar/header/identity/displayName. URL never navigates away. Backed by iota_cross_chain_profiles cache.
type: feature
---
When a user searches a non-IOTA domain (e.g. .eth, .box, .crypto, .vanity, .base.eth)
and the resolved EVM address is linked to a vanity.iota in `iota_wallet_links`,
vanity.box renders the linked .iota profile (socials, tokens, NFTs, identity) but
overlays the searched domain's `avatar`, `header`, `identity`, and `displayName`.

Hard rules:
- The URL MUST stay on the searched name — never navigate to the .iota path.
- The overlay must accept MULTIPLE candidate EVM addresses (UD/.box profiles can
  hide the EVM address inside `ensRecords.address`, `links.ethereum`, `records.ETH`,
  `records['crypto.ETH.address']`, or any record key containing 'eth').
- The render branch is OVERLAY-AWARE, not name-suffix-aware: the IOTA profile
  renders whenever `isIotaName(displayQuery) || (ensOverlay && (iotaOnchainProfile || iotaOnchainProfileLoading))`.
- `setEnsOverlay(...)` MUST be called BEFORE any awaited fetch so the overlay
  state survives stale-search aborts.
- The cross-chain IIFE must NOT bail on `searchIdRef.current !== currentSearchId`
  after the linked iota name is resolved — the resolved name is deterministic for
  the searched domain, so a "late" result is still correct.
- The auto-search useEffect must call `handleSearch(username)` directly (NO
  setTimeout) to avoid StrictMode double-mount races.

Persistent cache (denormalized, primary lookup):
- Table `public.iota_cross_chain_profiles` (PK `iota_name`) stores:
  `owner_address`, `evm_address` (lowercased), `ton_address`, `apt_address`,
  `sui_address`, `ipfs_cid`, `display_name`, `avatar_url`.
- Indexed on `lower(evm_address)` for instant reverse lookup.
- Trigger `trg_sync_iota_cross_chain` on `iota_wallet_links` keeps it in sync on
  every insert/update. Backfilled on migration.
- Both the client (`SearchInterface` cross-chain IIFE) and the edge function
  (`get-iota-name-by-evm`) query this cache FIRST and only fall back to
  `iota_wallet_links` on miss.

Edge function `get-iota-name-by-evm`:
- Accepts `evmAddress`, `evmAddresses[]`, OR `searchedName` (resolved via
  `resolve-profile`).
- All candidates are trim+lowercased before query.
- Lookup order: (1) `iota_cross_chain_profiles.evm_address IN (...)`,
  (2) `iota_wallet_links` OR-clause `evm_address.ilike.<addr>`,
  (3) explicit `eq('evm_address', candidates[0]).eq('chain','ethereum')`.
- Retries DB errors once with 250ms backoff.
- Logs candidate list, OR clause, and returned row count.

Client (`SearchInterface.handleSearch` / cross-chain IIFE):
- Builds candidates from `profile.address`, `profile.ensRecords.address`,
  `profile.links.ethereum`, `profile.records.ETH`,
  `profile.records['crypto.ETH.address']`, any record key containing 'eth',
  plus the raw query if it's an EVM address.
- Sets `ensOverlay` BEFORE awaiting any fetch.
- Tries cache table first, then edge function.
- Sets `displayQuery = iotaName` and fetches IOTA on-chain profile, but does NOT
  modify `location.pathname`.
- Always logs `🔗 Cross-chain candidates`, `🔗 Cross-chain cache hit/edge response`,
  `🔗 Cross-chain: <searched> -> linked .iota: <name>`, and
  `🔗 Overlay applied: { searched, iotaName, hasOnchain }`.
- `ensOverlay` is reset on every new search.

Render gate (`ProfileCard` branch):
- IOTA profile renders when
  `(isIotaName(displayQuery) || (ensOverlay && (iotaOnchainProfile || iotaOnchainProfileLoading))) && iotaOnchainProfile`.
- While IOTA on-chain JSON is still streaming in, an interim overlay card shows
  the ENS branding on top of the base `web3BioProfile` to avoid the
  "blank ENS card" failure mode.
