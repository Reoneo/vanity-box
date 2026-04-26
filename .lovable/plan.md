## Goal
Three improvements to cross-chain profile display:
1. Show a **Sui wallet badge** on every cross-chain profile (ENS, UD, .box, etc.) — not just `.iota` profiles — using the new blue Sui drop icon.
2. Replace the **TON token icon** in the token window with the new TON diamond logo.
3. Sort the **token list by USD value, highest first**.

## Background
- `ProfileCard` already accepts `linkedSuiAddress` and renders it inside the chain selector via `CHAIN_MEDIA.sui`. The icon `sui-logo-blue-circle.png` exists.
- Bug: `SearchInterface` only resolves `linkedSuiAddress`/`linkedTonAddress` when `normalizeIotaQuery(displayQuery)` returns a `.iota` name. For `smith.eth`, `john.box`, etc. the resolver short-circuits and never queries `iota_cross_chain_profiles` / `iota_wallet_links`, so the Sui (and TON) badge never appears on cross-chain views.
- Token icons come from upstream APIs; TON jettons return TonAPI icons. To enforce a unified TON brand mark we override the icon for `chain === 'ton'` (or symbol `TON`) using a local asset.
- Token list is currently rendered in `portfolioTokens` natural order; we need a sorted derivation.

## Changes

### 1. Sui badge on cross-chain profiles
- Save uploaded Sui icon as `src/assets/sui-logo-blue-circle-new.png` (replaces the existing reference, or update the import to use the new file).
- In `src/components/SearchInterface.tsx`:
  - When the searched query is an `.iota` name → keep current resolver path.
  - When it is **any other domain** (ENS, UD/.box, etc.) → resolve linked Sui (and TON) by reverse-mapping the resolved EVM wallet address to `iota_cross_chain_profiles` rows whose `evm_address` matches. Specifically:
    - After the profile resolves and we have `currentWalletAddress`, run a second effect that queries `iota_cross_chain_profiles` with `.eq('evm_address', currentWalletAddress.toLowerCase())` selecting `sui_address, ton_address`.
    - If a row exists, set `linkedSuiAddress` / `linkedTonAddress` accordingly so the existing `linkedWalletOptions` in `ProfileCard` lights up the Sui (and TON) badge.
  - Cache to localStorage keyed by EVM address (`cross-linked-sui:0x…`) for instant subsequent loads.
  - Reset both states when `displayQuery` changes to avoid stale badges.

### 2. TON token icon override
- Save uploaded TON diamond as `src/assets/ton-token-icon.png`.
- In `src/components/ProfileCard.tsx`, in the two token-list renderers (lines ~1711 and ~3348), when `token.chain === 'ton'` or `token.symbol?.toUpperCase() === 'TON'`, render the local `tonTokenIcon` instead of `token.icon`.

### 3. Sort tokens by value desc
- In `ProfileCard.tsx`, derive `sortedPortfolioTokens` via `useMemo` that sorts `portfolioTokens` by `(token.value || 0)` descending (stable; ties broken by symbol).
- Replace both `portfolioTokens.map(...)` token-list iterations with `sortedPortfolioTokens.map(...)`. Total value calc remains unchanged.

## Files touched
- `src/assets/sui-logo-blue-circle-new.png` (new asset from upload)
- `src/assets/ton-token-icon.png` (new asset from upload)
- `src/components/SearchInterface.tsx` (cross-chain reverse linker)
- `src/components/ProfileCard.tsx` (TON icon override + sorted token render + new Sui icon import)

## Acceptance
- Visiting `/smith.eth` (or any UD/ENS name) shows a **Sui badge** in the wallet chip selector if that wallet is linked in `iota_cross_chain_profiles`.
- TON tokens in the token window display the new diamond TON logo regardless of API-provided icon.
- Tokens render top-down by USD value (highest first); zero-value tokens fall to the bottom.
