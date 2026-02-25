
Problem confirmed from live data and logs:
- The profile route is `/Vanity.iota`.
- `get-iota-linked-evm` is being called, but returns `{ success: false, evmAddress: null }`.
- `public.iota_wallet_links` is currently empty (no row for `vanity.iota`).
- The identity modal screenshot shows an existing `EthereumWalletOwnershipCredential` VC, but SearchInterface only falls back to `localStorage`, not the existing encrypted identity vault.
- Because this VC was issued before the `localStorage` fallback was introduced, `linkedEvmAddress` stays null, and the UI keeps showing “No Ethereum wallet linked…”.

Most important technical constraint:
- `SearchInterface` is not wrapped by `IdentityProvider`, so using `useIdentity()` there would throw.  
- Reliable fallback must therefore read from the encrypted vault directly (`loadVaultFromStorage`) using the same key format already used by IdentityContext (`vault-key-${walletAddress}`).

Implementation plan (no user action required once shipped)

1) Harden linked EVM resolution in `src/components/SearchInterface.tsx` with a true multi-source resolver
- Add a resolver chain for `.iota` profiles:
  1. `localStorage` key `iota-linked-evm:${normalizedName}` (fast path)
  2. local encrypted identity vault fallback (owner path for old VCs)
  3. edge function `get-iota-linked-evm` (public viewer path)
- Add local vault helper logic:
  - Import `loadVaultFromStorage` from `@/lib/identity/vault`.
  - Try candidate vault keys from available addresses (`iotaWalletAddress`, `iotaOwnerAddress`, and `web3BioProfile.address`), deduped.
  - Decode vault and find latest VC where:
    - `type === "EthereumWalletOwnershipCredential"`
    - `claims.address` matches EVM regex `^0x[a-fA-F0-9]{40}$`
    - `claims.name` matches current `.iota` profile case-insensitively.
  - When found: set `linkedEvmAddress`, cache into `localStorage`, and mark `hasLocalEvmVc=true`.
- Keep DB lookup, but make it non-destructive:
  - If DB returns a valid address, prefer it and cache locally.
  - If DB returns null, do not wipe a valid local-vault/localStorage resolution.
- Add resolver state flags:
  - `isResolvingLinkedEvm` to avoid false empty-state flicker.
  - `hasLocalEvmVc` to support UI gating.

2) Ensure linked address immediately triggers fresh NFT/POAP loading
- Add a dedicated effect that runs when a valid `linkedEvmAddress` becomes available for `.iota`:
  - Reset stale states that can block rendering:
    - `setNfts([])`, `setNftNextCursor(null)`, `setOpenseaAttempted(false)`, `setOpenseaHasErrors(false)`
    - `setPoapTokens([])`, `setPoapCount(0)`, `setPoapTotalCount(0)`, `setPoapHasMore(false)`, `setPoapOffset(0)`
  - Trigger immediate fetches for that linked EVM:
    - `fetchNfts(linkedEvmAddress)`
    - POAP fetch using same address (reuse existing fetch path; avoid duplicate logic by extracting a small `loadPoapsForAddress` helper).
- Guard this effect with a ref key (`name:address`) so it executes once per profile+linked-address, preventing repeated refetch loops.

3) Use one derived EVM source everywhere for EVM NFT/POAP behavior
- Define a single derived source in SearchInterface:
  - `evmForNfts = isIotaName(displayQuery) ? linkedEvmAddress : web3BioProfile?.address`
- Apply this consistently in:
  - NFT preload effect
  - POAP preload effect
  - `onEnsureOpenSeaNfts`
  - `handleLoadMoreNfts` (currently still uses `web3BioProfile.address`, which breaks `.iota` load-more path)
- Keep strict EVM regex validation before every EVM API call.

4) Small UX correction in `src/components/ProfileCard.tsx`
- Add props from SearchInterface:
  - `hasLocalEvmVc?: boolean`
  - `isResolvingLinkedEvm?: boolean`
- Update “No Ethereum wallet linked…” condition to avoid false negatives while fallback is resolving:
  - Show only when:
    - `isIotaProfile`
    - `!linkedEvmAddress`
    - `!hasLocalEvmVc`
    - `!isResolvingLinkedEvm`
    - and no POAP/NFT data yet
- Keep existing OpenSea/POAP visibility rules tied to linked EVM presence.

5) Optional reliability hardening in `supabase/functions/get-iota-linked-evm/index.ts`
- Add safe JSON parsing:
  - If request body is empty/malformed, return clean 400 payload instead of throwing `Unexpected end of JSON input`.
- This removes noisy edge errors and makes behavior deterministic.

Why this will fix your exact case
- Your DB row is missing, and your VC already exists from earlier flow.
- The new vault fallback resolves linked ETH directly from your existing credential, without requiring re-linking or any manual action.
- Once resolved, the app will immediately refresh and fetch OpenSea + POAP with that EVM address.

Validation checklist after implementation
1. Open `/Vanity.iota` with existing linked Ethereum VC in vault:
   - “No Ethereum wallet linked…” no longer persists.
   - `get-opensea-nfts` and `get-poap-data` requests fire using a 42-char EVM address (not the 66-char IOTA address).
2. If DB row is absent:
   - Owner still sees POAP/NFTs via vault fallback.
3. If DB row exists:
   - Public viewers also resolve linked EVM and see EVM sections.
4. Non-IOTA profiles:
   - Continue using `web3BioProfile.address` unchanged.
5. No invalid EVM calls:
   - All EVM fetches remain regex-guarded.

Files to update
- `src/components/SearchInterface.tsx` (primary logic fix)
- `src/components/ProfileCard.tsx` (empty-state UX guard)
- `supabase/functions/get-iota-linked-evm/index.ts` (optional parser hardening)
