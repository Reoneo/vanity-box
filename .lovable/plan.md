
## Diagnosis

The error `Unsupported chain. Use "ton" or "aptos"` shown in the screenshot is being returned by an **old deployed version** of the `issue-wallet-vc` edge function. The current source code (`supabase/functions/issue-wallet-vc/index.ts` line 91-96) already accepts `sui` and would return a different error message (`Use "ton", "aptos", or "sui"`).

The frontend (`SuiWalletLinkSection` in `IdentityPanel.tsx`) is correctly sending `chain: 'sui'` via `callEdge`. The chain validation, VC type map, and DB persistence on the server already support sui.

This is purely a stale-deployment issue — the source was updated but the live bundle never refreshed.

## Fix

1. Force-redeploy `issue-wallet-vc` so the live bundle picks up Sui support.
2. Verify deployment by checking edge function logs for the new validation message.
3. If redeploy alone doesn't clear it, add a trivial cache-busting comment (e.g. version bump in a header comment) and redeploy again.

No code logic changes are required — only redeployment.
