
# Add "Remove Linked Ethereum Wallet" Option

## Problem
There's no way to remove a linked Ethereum wallet from an `.iota` profile. You need a hard reset option to unlink and re-link your Ethereum address to test whether POAPs and OpenSea NFTs fetch correctly.

## Solution
Add an "Unlink Wallet" button to the existing `LinkEthereumWalletModal` that appears when a linked VC is detected. This will clear the credential from all three persistence layers (vault, localStorage, database) and reset the NFT/POAP state so you can immediately re-link.

## Changes

### 1. `src/contexts/IdentityContext.tsx` -- Add `removeCredentialByType` action
- Add a new function that filters out VCs matching a given type (e.g. `EthereumWalletOwnershipCredential`) from `vcList`
- Re-save the vault with the updated list
- Expose it via the context so the modal can call it

### 2. `src/types/identity.ts` -- Extend `IdentityActions` interface
- Add `removeCredentialByType: (type: string) => Promise<void>` to the actions interface

### 3. `src/components/LinkEthereumWalletModal.tsx` -- Add "Unlink" button
- When `existingEvmVc` is detected, show a red "Unlink Wallet" button next to the green "already linked" banner
- On click:
  1. Call `removeCredentialByType('EthereumWalletOwnershipCredential')` to purge from vault
  2. Remove `localStorage` key `iota-linked-evm:${iotaName.toLowerCase()}`
  3. Call edge function to delete the row from `iota_wallet_links` DB table
  4. Dispatch a `iota-evm-unlinked` custom event so SearchInterface can clear NFT/POAP state
  5. Reset modal to `idle` state so the "Sign & Link" button becomes active again

### 4. `src/components/SearchInterface.tsx` -- Listen for unlink event
- Add listener for `iota-evm-unlinked` event
- On receive: set `linkedEvmAddress` to `null`, clear NFT/POAP arrays, reset fetch flags

### 5. Edge function cleanup (optional but recommended)
- The existing `get-iota-linked-evm` edge function can be reused, or a simple direct Supabase delete call from the modal via a small new edge function or inline `supabase.functions.invoke('delete-iota-linked-evm', { body: { iotaName } })`. Since the DB table requires `service_role` for deletes, we need a thin edge function.
- Create `supabase/functions/delete-iota-linked-evm/index.ts` that accepts `{ iotaName }` and deletes the matching row from `iota_wallet_links`.

## Flow After Implementation
1. Open Identity panel on your `.iota` profile
2. Tap "Link Ethereum Wallet"
3. See "Wallet already linked" with the address and a new red "Unlink" button
4. Tap "Unlink" -- credential removed from vault, localStorage cleared, DB row deleted
5. Modal resets to show "Sign & Link" button
6. Re-link your wallet -- fresh VC issued, NFTs/POAPs should load immediately
