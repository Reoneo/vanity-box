

## Plan

### 1. NFT collection headers — replace "OpenSea" header with collection name + total count

In `src/components/ProfileCard.tsx` (desktop NFT panel header, ~line 1644):
- When `nftCategory === 'opensea' | 'magiceden'` AND `expandedCollection` is set, the header should show the **collection name** (formatted) instead of `"NFTs"`.
- Show total count as `"{n} NFTs"` (no cap, no "items").
- Apply same treatment to all sub-categories: `poaps`, `worldchain`, `hyperliquid`, `ensdomains`, `basenames`, `iota:*`, `ton:*`, `magiceden`. The header text becomes the collection name; subtitle below or inline shows total count.

### 2. Pagination — show 25, "Load more" button, no 1000 cap

- Add local state `displayLimit` (default 25) per category in `ProfileCard.tsx`. Reset on `expandedCollection` change.
- All grid renders (`opensea`, `magiceden`, `hyperliquid`, `ensdomains`, `basenames`, `iota:*`, `ton:*`, `worldchain`) slice items to `displayLimit` and render a `"Load 25 more"` button at the bottom when `total > displayLimit`.
- **Edge function `supabase/functions/get-opensea-nfts/index.ts`**: raise `MAX_TOTAL_NFTS` from `1000` → `Number.MAX_SAFE_INTEGER` (effectively uncapped) and `MAX_PAGES_PER_CHAIN` from `10` → `100` so all NFTs are fetched. Total count returned is then accurate.

### 3. Remove NFT titles from domain thumbnails

In `ProfileCard.tsx` opensea/magiceden grid (~line 1955, 1986):
- Detect domain-like NFTs via `isDomainLike(nft.collection)` (reuse existing helper).
- When domain-like, drop the `<div className="absolute inset-x-0 bottom-0 ...">` overlay so the image renders edge-to-edge with no name caption.
- Same treatment for `ensdomains` and `basenames` grids: remove the `<p>{domain.name}</p>` caption.

### 4. Add real Sui wallet linking section

**Dependencies (auto-added on first build):**
```
@mysten/dapp-kit @mysten/sui @tanstack/react-query
```
(`@tanstack/react-query` is already installed.)

**`src/main.tsx`** — wrap with Sui providers:
```tsx
import '@mysten/dapp-kit/dist/index.css';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
});
```
Wrap inside the existing `QueryClientProvider`:
```tsx
<SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
  <WalletProvider autoConnect={false}>
    <App />
  </WalletProvider>
</SuiClientProvider>
```
The provided snippet in the user message is correct in shape. Adjusted minor details:
- `WalletProvider` accepts `autoConnect={false}` to keep wallet idle until user opts in.
- Providers nest **inside** `QueryClientProvider` (already exists in `App.tsx`) — so we mount Sui providers in `App.tsx` between `QueryClientProvider` and `AppContent`, not in `main.tsx`, to align with the project's provider layout.

**`src/components/identity/IdentityPanel.tsx`**:
- Replace the `ComingSoonWalletSection` for Sui with a new `SuiWalletLinkSection` mirroring `TonWalletLinkSection`:
  - Uses `useCurrentAccount`, `useConnectWallet`, `useWallets`, `useSignPersonalMessage` from `@mysten/dapp-kit`.
  - Flow: connect → sign nonce message → call `callEdge('issue-wallet-vc', { chain: 'sui', address, signature, message, holderDid, iotaName })` → store as `SuiWalletOwnershipCredential` VC.
  - On link, write `linked_sui_address` to `iota_wallet_links` table for downstream NFT/token/activity fetches.
- Vechain section stays as `ComingSoonWalletSection` for now.

**Sui asset display (NFTs/Tokens/Activity)**:
- New edge functions `get-sui-nfts`, `get-sui-tokens`, `get-sui-transactions` calling Sui fullnode RPC (`suix_getOwnedObjects`, `suix_getAllBalances`, `suix_queryTransactionBlocks`).
- New hook `useSuiAssets(suiAddress)` in `src/hooks/`.
- In `ProfileCard.tsx`, add a Sui NFT category button (gradient: Sui cyan `#4DA2FF`) and Sui tokens merged into portfolio list, mirroring TON integration.

### 5. Hyperliquid OpenSea collection visibility

The user's HL OpenSea collection is fetched by `get-opensea-nfts` (already covers Arbitrum/Base). Currently it's bucketed as just another OpenSea collection. With change #1 (per-collection top-level buttons — already in place from last task) it will appear. Two reinforcements:
- Confirm the OpenSea edge function returns the collection regardless of name (no filter) — already true except for POAP v2.
- After the fetch, log `console.log('OpenSea collections:', Object.keys(openSeaGroupedNfts))` to verify in console (temporary debug log left in place during this fix).

If after lifting the cap (change #2) the HL collection still doesn't appear, the issue is upstream OpenSea returning it under a chain we don't query. We will then add `"hyperevm"` to the `chains` array in the edge function as a follow-up if OpenSea ever supports it.

## Files touched
- `src/components/ProfileCard.tsx` — header rename, per-category pagination state + load-more, drop domain captions
- `supabase/functions/get-opensea-nfts/index.ts` — uncap MAX_TOTAL_NFTS / MAX_PAGES_PER_CHAIN
- `src/App.tsx` — add `SuiClientProvider` + `WalletProvider`
- `src/components/identity/IdentityPanel.tsx` — replace Sui placeholder with real `SuiWalletLinkSection`
- `src/hooks/useSuiAssets.ts` — new
- `supabase/functions/get-sui-nfts/index.ts` — new
- `supabase/functions/get-sui-tokens/index.ts` — new
- `supabase/functions/get-sui-transactions/index.ts` — new
- `src/integrations/supabase/types.ts` — extend `iota_wallet_links` with `linked_sui_address` (migration required)

