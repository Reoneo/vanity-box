## Root cause

The Sui linking flow is fully implemented and **does** persist your linked wallet — but the badge resolver reads the wrong table:

| | TON (works) | Sui (broken) |
|---|---|---|
| Where the link is **written** | `iota_wallet_links` row: `iota_name = '<name>:ton'`, `chain = 'ton'`, address in `evm_address` column | `iota_wallet_links` row: `iota_name = '<name>:sui'`, `chain = 'sui'`, address in `evm_address` column |
| Where `SearchInterface` **reads** | `get-iota-linked-ton` edge function → queries `iota_wallet_links` ✅ | Direct query to `iota_cross_chain_profiles.sui_address` ❌ — **wrong table, never populated** |

`issue-wallet-vc` (line 141) writes the Sui link to `iota_wallet_links` exactly like TON. The Sui linking UI in `IotaProfileEditModal` / `IdentityPanel` (line 1155) calls it correctly. The data IS in the database. Only the read query is wrong, so the badge stays hidden.

## Fix

1. **New edge function `get-iota-linked-sui`** — clone of `get-iota-linked-ton`, queries `iota_wallet_links` for `iota_name = '<name>:sui'` AND `chain = 'sui'`, returns `{ success, suiAddress }`.

2. **Update `src/components/SearchInterface.tsx`** (the `.iota` resolver around line 719):
   - Replace the `iota_cross_chain_profiles.sui_address` Supabase query with `supabase.functions.invoke('get-iota-linked-sui', { body: { iotaName: name } })`.
   - Use `suiData.suiAddress` instead of `suiData.sui_address`.

3. **Listen for the live link event** in `SearchInterface.tsx` — add a window listener for `iota-sui-linked` (already dispatched at `IdentityPanel.tsx` line 1173) that calls `setLinkedSuiAddress(suiAddress)` so the badge appears immediately after linking, mirroring the existing `iota-ton-linked` listener.

4. **Cross-chain reverse lookup** (non-`.iota` profiles, around line 770): same problem in reverse — keep that path but switch it to query `iota_wallet_links` joined back to the IOTA name owner instead of `iota_cross_chain_profiles`. (Defer if no Sui owners are searchable that way today; primary fix is steps 1–3.)

## Files touched
- `supabase/functions/get-iota-linked-sui/index.ts` (new)
- `src/components/SearchInterface.tsx` (swap query + add event listener)

## Acceptance
- Searching your `.iota` name shows the **Sui badge** in the wallet chip selector with the shortened Sui address — same UX as ETH / TON / IOTA.
- Linking a new Sui wallet via the Identity panel makes the badge appear without a page refresh.
- No DB schema changes required; your existing link in `iota_wallet_links` resolves immediately.
