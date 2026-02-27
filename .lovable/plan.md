
# Fix "Link Aptos Wallet" -- Migrate to Official Aptos Wallet Adapter

## Problem

The current Petra integration uses the legacy `window.aptos` global object, which:
- Is not injected on mobile browsers (even inside Petra's in-app browser it can be unreliable)
- Does not support AIP-62 (the modern Aptos wallet standard)
- Fails silently when Petra is installed as a mobile app but the site is opened in Safari/Chrome
- The deeplink workaround (`https://petra.app/explore?link=...`) opens Petra's Explore page but doesn't reliably inject `window.aptos` back into the webview

## Solution

Replace the custom `PetraWalletContext` with the official `@aptos-labs/wallet-adapter-react`, which:
- Handles Petra detection on desktop AND mobile natively
- Supports mobile deeplink flows via `deeplinkProvider` (built into the adapter)
- Uses AIP-62 standard wallet registration
- Provides `signMessage` that works across all contexts
- Shows Petra as an available wallet even when the extension isn't detected (mobile-aware)

## Implementation Steps

### 1. Install the Aptos Wallet Adapter packages

Add `@aptos-labs/wallet-adapter-react` (the adapter already bundles Petra support via AIP-62 auto-detection; no separate wallet plugin package needed for Petra).

### 2. Replace `PetraWalletContext.tsx` with Aptos Wallet Adapter provider

Rewrite `src/contexts/PetraWalletContext.tsx` to:
- Wrap the `AptosWalletAdapterProvider` with `dappInfo` config (name: "Vanity.box", image)
- Set `optInWallets: ["Petra"]` to always show Petra even on mobile
- Set `autoConnect: false` (we only connect when the user explicitly links)
- Export context values that match the existing `PetraWalletContextType` interface so downstream code doesn't break

### 3. Update `AptosWalletLinkSection` in `IdentityPanel.tsx`

Refactor `handleLinkAptos` to:
- Use `useWallet()` from the adapter instead of the custom `usePetraWallet()` hook
- Call `connect("Petra")` which the adapter resolves via extension OR deeplink
- Remove all manual `window.aptos` checks, `isPetraInjected()`, `waitForPetraInjection()`, `ensurePetraContext()`, and `openPetraApp()` helpers -- the adapter handles all of this
- Keep the existing `signMessage` flow (message construction, nonce, VC issuance) but use the adapter's `signMessage` method
- Keep address normalization and VC issuance logic unchanged

### 4. Keep `usePetraWallet` hook working

Update `src/hooks/use-petra-wallet.tsx` to re-export from the adapter-based context so any other consumers still work.

### 5. No changes needed to backend

The `issue-wallet-vc` edge function receives `{ holderDid, address, message, signature, iotaName, chain: 'aptos' }` -- this contract stays the same.

## Technical Details

```text
Before:
  PetraWalletContext -> window.aptos (legacy global)
  Mobile: manual deeplink -> unreliable injection polling

After:
  AptosWalletAdapterProvider -> AIP-62 standard detection
  Mobile: adapter handles deeplink/redirect automatically
  connect("Petra") works on desktop (extension) and mobile (deeplink)
```

Key adapter usage in the link flow:
```tsx
const { connect, disconnect, account, signMessage, connected } = useWallet();

// Connect (adapter handles mobile deeplink automatically)
await connect("Petra");

// Sign the linking message
const signResult = await signMessage({ message, nonce });

// Send to backend for VC issuance (same as before)
await callEdge('issue-wallet-vc', { ... });
```

## Files Changed

| File | Change |
|---|---|
| `src/contexts/PetraWalletContext.tsx` | Rewrite to wrap `AptosWalletAdapterProvider`; export compatible context interface |
| `src/components/identity/IdentityPanel.tsx` | Replace `usePetraWallet()` with `useWallet()` from adapter; remove manual injection/deeplink helpers; simplify `handleLinkAptos` |
| `src/hooks/use-petra-wallet.tsx` | Update to re-export from new adapter context |
| `src/App.tsx` | No change needed (still imports `PetraWalletProvider`) |

## Risks & Mitigations

- **Adapter version compatibility**: The `@aptos-labs/wallet-adapter-react` v3+ uses AIP-62 auto-detection. Petra is a first-class supported wallet.
- **"Site not recognized" warning**: This is Petra's own security prompt and cannot be suppressed from dApp code. The flow will continue cleanly after the user taps OK.
- **signMessage response format**: The adapter's `signMessage` returns a slightly different shape than the legacy `window.aptos.signMessage`. The code will need to extract `signature` and `fullMessage` fields from the adapter response format.
