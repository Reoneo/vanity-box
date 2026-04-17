
## Problem

Clicking "Continue with Google" or "Continue with Apple" on the Aptos linking section opens `https://web.petra.app/prompt/` and stalls. The Aptos Connect (keyless) flow is misconfigured.

## Root cause

In `src/contexts/PetraWalletContext.tsx`:

```ts
dappConfig={{
  network: 'mainnet' as any,                  // ❌ string, not Network enum
  aptosConnect: { dappId: 'vanity-box' },     // ❌ not a real registered dappId
}}
```

The `AptosConnectGoogleWallet` / `AptosConnectAppleWallet` plugins (auto-injected by `@aptos-labs/wallet-adapter-core` when `dappConfig` is present) **require**:
1. A real `Network` enum value imported from `@aptos-labs/ts-sdk` (not the string `'mainnet'`).
2. A valid `dappId` (UUID) registered at the Aptos Connect dashboard (https://aptosconnect.app). Without it, the keyless OAuth redirect fails and the adapter falls back to a generic Petra prompt URL.

Additionally, in `src/components/identity/IdentityPanel.tsx`, when the adapter doesn't surface Google/Apple options, we **stub** them with `isInstalled: true`. That stub then triggers `petra.connect('Continue with Google')` against a wallet name the adapter doesn't know — which currently leaks into the Petra mobile redirect path.

## Fix plan

### 1. `src/contexts/PetraWalletContext.tsx`
- Import `Network` from `@aptos-labs/ts-sdk`.
- Use `network: Network.MAINNET`.
- Replace the placeholder `dappId` with a real Aptos Connect dappId. Until the user registers one, fall back gracefully:
  - Read from `import.meta.env.VITE_APTOS_CONNECT_DAPP_ID`.
  - If absent, **omit** the `aptosConnect` block entirely so the adapter doesn't half-initialize broken keyless wallets.
- Keep `optInWallets={['Continue with Google', 'Continue with Apple']}`.

### 2. `src/components/identity/IdentityPanel.tsx`
- Stop stubbing missing Google/Apple wallet entries. Only render the actual wallets exposed by `petra.wallets`.
- If neither is present (no dappId configured), show an inline notice:  
  *"Aptos Connect (Google / Apple sign-in) is not configured. Add `VITE_APTOS_CONNECT_DAPP_ID` to enable it."*
- This prevents the broken Petra prompt redirect entirely.

### 3. Need from the user
A real Aptos Connect `dappId`. To obtain one:
1. Go to https://aptosconnect.app and register the dapp (`vanity.box`, redirect URLs: `https://vanity.box`, `https://www.vanity.box`, `https://*.lovable.app`).
2. Copy the issued dappId UUID.
3. Add it as `VITE_APTOS_CONNECT_DAPP_ID` in project env.

## Files touched
- `src/contexts/PetraWalletContext.tsx` — fix dappConfig
- `src/components/identity/IdentityPanel.tsx` — remove stubbed wallet entries, add config-missing notice

## Question for you

Before I implement, do you already have an Aptos Connect dappId registered, or should I ship the fix with the graceful "not configured" notice so you can register one and add the env var afterward?
