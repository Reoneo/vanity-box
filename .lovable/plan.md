
## Fix WalletContext Error and Simplify Wallet Connection

This plan addresses the "Could not find WalletContext" error on mobile and simplifies the wallet connection flow to only use IOTA wallet connect on both mobile and desktop.

---

### Problem Analysis

The error "Could not find WalletContext" occurs because:

1. **IotaWalletProvider** intentionally skips rendering IOTA providers on mobile phones and special apps (Telegram, World App)
2. **IotaSubdomainMintModal** directly imports and uses `useCurrentAccount` and `ConnectModal` from `@iota/dapp-kit`
3. **ConnectWalletChooser** also uses these hooks directly
4. When these components render on mobile, they try to access a context that doesn't exist

---

### Solution Overview

1. Create safe wrapper components for IOTA hooks that gracefully handle missing context
2. Update `IotaSubdomainMintModal` to use safe hooks and show a "desktop required" message on mobile
3. Remove WalletConnect from the connect button flow - only trigger IOTA connection
4. Preserve World ID (World App) and Telegram (TON) connection flows for those specific environments

---

### Technical Implementation

#### 1. Update `src/hooks/use-iota-wallet-safe.tsx`

Add a safe wrapper for `useCurrentAccount` that can be used in components that may render on mobile:

```typescript
// Add new hook
export function useIotaCurrentAccountSafe() {
  if (!isIotaAvailable) {
    return null;
  }
  return useCurrentAccount();
}
```

#### 2. Update `src/components/IotaSubdomainMintModal.tsx`

Replace direct IOTA hook imports with safe versions:

- Replace `useCurrentAccount` from `@iota/dapp-kit` with `useIotaCurrentAccountSafe`
- Wrap the `ConnectModal` in a conditional render check for `isIotaAvailable`
- The existing "Desktop Required" message will be shown on mobile

Key changes:
```typescript
// Before
import { useCurrentAccount, ConnectModal } from '@iota/dapp-kit';
const currentAccount = useCurrentAccount();

// After
import { useIotaCurrentAccountSafe, isIotaAvailable } from '@/hooks/use-iota-wallet-safe';
const currentAccount = useIotaCurrentAccountSafe();

// Only render ConnectModal when IOTA is available
{isIotaAvailable && (
  <ConnectModal ... />
)}
```

#### 3. Update `src/components/WalletConnection.tsx`

Simplify the connection flow:
- On desktop: Trigger IOTA wallet connect directly (current behavior)
- On mobile (standard browser): Show a message that wallet connection requires desktop, OR redirect to World App
- In Telegram: Continue using TON wallet connection
- In World App: Continue using World ID wallet authentication

Update `handleTriggerConnect`:
```typescript
const handleTriggerConnect = () => {
  if (isTelegramWebView()) {
    handleTelegramConnect();  // TON wallet
  } else if (MiniKit.isInstalled()) {
    handleConnect();  // World App wallet auth
  } else if (isDesktopBrowser) {
    setShowIotaModal(true);  // IOTA wallet (current)
  } else {
    // Mobile browser - show IOTA modal which will display "Desktop Required"
    setShowIotaModal(true);
  }
};
```

Remove any WalletConnect fallback from the else branch.

#### 4. Delete or simplify `src/components/ConnectWalletChooser.tsx`

This component is no longer needed since we're not offering a choice between IOTA and WalletConnect. It can be:
- Deleted entirely, OR
- Simplified to just trigger IOTA connect directly

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-iota-wallet-safe.tsx` | Add `useIotaCurrentAccountSafe` hook |
| `src/components/IotaSubdomainMintModal.tsx` | Use safe IOTA hooks, conditional ConnectModal render |
| `src/components/WalletConnection.tsx` | Remove WalletConnect flow, trigger IOTA connect on mobile (shows desktop required message) |
| `src/components/ConnectWalletChooser.tsx` | Delete file (no longer needed) |

---

### Flow Diagram After Changes

```text
User clicks "Connect Wallet"
           │
           ▼
    ┌──────────────────┐
    │  In Telegram?    │──Yes──▶ TON Wallet Connect
    └──────────────────┘
           │ No
           ▼
    ┌──────────────────┐
    │  In World App?   │──Yes──▶ World ID Wallet Auth
    └──────────────────┘
           │ No
           ▼
    ┌──────────────────┐
    │  Any Device      │──────▶ Show IOTA Connect Modal
    └──────────────────┘
           │
           ▼
    ┌──────────────────────────────┐
    │  Mobile?                     │
    │  → Shows "Desktop Required"  │
    │  Desktop?                    │
    │  → Shows wallet options      │
    └──────────────────────────────┘
```

---

### Preserved Functionality

- **World ID/World App**: Continues to use MiniKit wallet authentication
- **Telegram**: Continues to use TON wallet connection
- **IOTA Desktop**: Works as before with wallet selection modal
- **Mobile Browser**: Shows "Desktop Required" message when trying to mint IOTA subdomains

---

### Edge Cases Handled

1. **Mobile browser search**: User can search for names, but minting will show "Desktop Required"
2. **Webview in apps**: Works fine as long as it's Telegram or World App (detected correctly)
3. **Tablet browsers**: Treated as desktop (iPads can use browser extensions)
