---
name: Cross-chain ENS-to-IOTA overlay
description: Searching an ENS/EVM domain whose address is linked to a vanity.iota loads the IOTA profile but overlays the ENS avatar/header/identity/displayName
type: feature
---
When a user searches a non-IOTA domain (e.g. .eth) and the resolved EVM address is linked
to a vanity.iota in `iota_wallet_links`, vanity.box renders the linked .iota profile
(socials, tokens, NFTs, etc.) but overlays the searched ENS domain's `avatar`, `header`,
`identity`, and `displayName`. The browser URL stays on the searched domain (no navigation).

Implementation:
- Edge function `get-iota-name-by-evm` does the reverse lookup (evm_address -> iota_name),
  preferring chain='ethereum'.
- `SearchInterface.handleSearch` calls it after the resolver returns a non-IOTA EVM-resolved
  profile, captures an `ensOverlay` state, sets `displayQuery` to the .iota name, and
  fetches the IOTA onchain profile.
- The ProfileCard render merges the overlay on top of `makeIotaDisplayProfile` output.
- `ensOverlay` is reset on every new search.
