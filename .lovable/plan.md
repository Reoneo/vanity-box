

## Why the cross-chain overlay didn't fire on `Smith.box`

The current code in `SearchInterface.tsx` (lines 1452-1505) only triggers the overlay when **all** of these are true after the initial profile resolves:

1. The query is not a `.iota` name and not a raw IOTA address.
2. `profile.platform !== 'iota'` and `profile.iotaDomain` is empty.
3. `profile.address` is a 0x-prefixed 40-hex EVM address.
4. `get-iota-name-by-evm` returns a row from `iota_wallet_links` matching that EVM address.

For `Smith.box` none of the expected `🔗 Cross-chain:` or `Cross-chain iota link lookup failed:` log lines appeared, which means the branch never entered. The most likely causes — and what we need to fix:

- **`profile.address` from the Unstoppable `.box` resolver isn't always a clean EVM address** (UD records can return chain-specific addresses, multi-chain records, or only an ENS-style identity), so the EVM regex check fails and the overlay block is skipped.
- The **reverse-lookup edge function only checks `iota_wallet_links.evm_address`** with a single `ilike` against the lowercase address. It doesn't try the checksummed form, doesn't try alternative columns where Aptos/TON/UD links may also have stored an EVM address, and doesn't accept the searched **domain name** as an input fallback.
- The **render branch** at line 2116 keys off `isIotaName(displayQuery)`. If anything fails to set `displayQuery` to the linked `.iota` name (e.g. because the overlay block exited early), the IOTA profile path is never selected.
- The other path at line 1433 (`profile.iotaDomain` set by the resolver) **rewrites the URL to the `.iota` name and does not set the overlay**, so even when it does work for some domains, the user loses the searched-domain branding and URL.

## Fix plan

### 1. Strengthen the address extraction before the cross-chain lookup (`SearchInterface.tsx`)
Before calling `get-iota-name-by-evm`, build a list of **candidate EVM addresses** from the resolved profile, in this order:
- `profile.address` if it matches `/^0x[a-fA-F0-9]{40}$/`
- `profile.ensRecords?.address`
- `profile.links?.ethereum` / `profile.records?.ETH` / any UD `crypto.ETH.address` record exposed by the resolver
- The original query if it itself is an EVM address

Pass each candidate to the edge function until one returns a linked `.iota` name.

### 2. Make the reverse-lookup edge function more forgiving (`get-iota-name-by-evm`)
- Accept either `evmAddress` or a `searchedName` (e.g. `smith.box`) and, when only a name is given, do an internal best-effort to resolve it to an address via existing `resolve-profile`.
- Query `iota_wallet_links` with both the lowercase and checksummed form of the address (using `or(evm_address.ilike.<lc>,evm_address.ilike.<cs>)`).
- Return the matched `chain` and the `evm_address` actually found, so the client can log/debug.

### 3. Always run the overlay path when an EVM address is found, even if the resolver also set `profile.iotaDomain`
Refactor lines 1430-1505 in `SearchInterface.tsx` so the overlay is the **single source of truth** for cross-chain rendering:

- Remove the auto-redirect on line 1444-1449 that navigates the URL away to the `.iota` name.
- Always capture `ensOverlay` (identity, displayName, avatar, header, platform) from the searched profile first.
- Then, in parallel, look up the linked `.iota` name (via `profile.iotaDomain` if present, otherwise via the strengthened `get-iota-name-by-evm` call from step 1).
- When a `.iota` name is found, set `displayQuery = iotaName` and fetch the IOTA on-chain profile, but **do not** modify `location.pathname` — the URL stays on `/Smith.box`.

### 4. Make the render branch overlay-aware, not displayQuery-aware
Update the gate on line 2107 and the conditional on line 2116 so the IOTA profile renders whenever **either** `isIotaName(displayQuery)` **or** `ensOverlay && iotaOnchainProfile` is true. This guarantees the merged card shows even if a future code path forgets to swap `displayQuery`.

### 5. Add diagnostic logs
Add explicit `console.log` lines for: candidates considered, edge-function response, and final overlay decision. This will make future regressions on other TLDs (`.crypto`, `.x`, `.eth`, `.base.eth`, `.vanity`) instantly debuggable.

### 6. Memory update
Update `mem://features/cross-chain-ens-iota-overlay.md` to record:
- The overlay must NEVER navigate the URL away from the searched name.
- The overlay must accept multiple candidate EVM addresses (UD profiles can hide the EVM address inside `ensRecords` / `links`).
- The render branch is overlay-aware, not name-suffix-aware.

## What you'll see after the fix
Searching `Smith.box` (or any `.eth` / `.crypto` / `.vanity` / `.base.eth` whose resolved EVM address is in `iota_wallet_links`) will:
- Keep the URL at `/Smith.box`.
- Render the full vanity.iota profile (socials, tokens, NFTs, identity panel data).
- Overlay the searched domain's avatar, header, identity (`Smith.box`) and display name on top.
- Log a clear `🔗 Cross-chain: smith.box -> linked .iota: <name>` line confirming the path took effect.

