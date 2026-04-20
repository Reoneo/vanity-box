---
name: Cross-chain ENS-to-IOTA overlay
description: Searching an ENS/EVM domain whose address is linked to a vanity.iota loads the IOTA profile but overlays the searched domain's avatar/header/identity/displayName. URL never navigates away.
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
  renders whenever `isIotaName(displayQuery) || (ensOverlay && iotaOnchainProfile)`.

Implementation:
- Edge function `get-iota-name-by-evm` accepts `evmAddress`, `evmAddresses[]`, OR
  `searchedName` (which it resolves via `resolve-profile`). It queries
  `iota_wallet_links` with an OR ilike across all candidates and prefers
  chain='ethereum'.
- `SearchInterface.handleSearch` builds the candidate list from `profile.address`,
  `profile.ensRecords.address`, `profile.links.ethereum`, `profile.records.ETH`,
  any record key with 'eth' in it, plus the raw query if it's an EVM address.
- On match: capture `ensOverlay` from the searched profile, set
  `displayQuery = iotaName`, fetch the IOTA on-chain profile, but do NOT touch
  `location.pathname`.
- The ProfileCard render merges `ensOverlay` on top of `makeIotaDisplayProfile`.
- `ensOverlay` is reset on every new search.
- Diagnostic logs (`🔗 Cross-chain candidates`, `🔗 Cross-chain edge response`,
  `🔗 Cross-chain: <searched> -> linked .iota: <name>`) help debug regressions
  on new TLDs.
