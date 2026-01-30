

## Enable IOTA Wallet on Mobile and Optimize Home Screen Layout

This plan addresses two issues: enabling IOTA wallet connection on mobile browsers, and reducing the size of the home screen elements to fit without scrolling.

---

### Problem Analysis

**Issue 1: IOTA Wallet Not Working on Mobile**

The current implementation blocks IOTA wallet functionality on mobile in three places:
1. `src/hooks/use-iota-wallet-safe.tsx` - `isIotaAvailable` returns `false` for mobile phones
2. `src/contexts/IotaWalletContext.tsx` - Skips rendering `IotaClientProvider` and `WalletProvider` on mobile
3. `src/components/IotaSubdomainMintModal.tsx` - Shows "Desktop Required" message based on mobile detection

Per the user's reference to IOTA v1.15.0 and their request, IOTA wallet connection should now work on both mobile and desktop.

**Issue 2: Home Screen Content Too Large**

The `HomeFeatureShowcase` component has elements that are too large for mobile screens, requiring scrolling to see all content.

---

### Solution Overview

1. Remove mobile phone restrictions from IOTA wallet integration
2. Keep special app detection (Telegram, World App) to preserve their dedicated wallet flows
3. Reduce sizes of HomeFeatureShowcase elements for mobile

---

### Technical Implementation

#### 1. Update `src/hooks/use-iota-wallet-safe.tsx`

Remove the mobile phone check from `isIotaAvailable` - only block IOTA in special apps:

```typescript
// Before: Blocked on mobile phones AND special apps
const checkIsMobilePhone = () => typeof window !== 'undefined' && 
  /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const checkIsInSpecialApp = () => typeof window !== 'undefined' && (
  !!(window as any).Telegram?.WebApp ||
  typeof (window as any).WorldApp !== 'undefined'
);

export const isIotaAvailable = typeof window !== 'undefined' && !checkIsMobilePhone() && !checkIsInSpecialApp();

// After: Only block in special apps (Telegram, World App)
const checkIsInSpecialApp = () => typeof window !== 'undefined' && (
  !!(window as any).Telegram?.WebApp ||
  typeof (window as any).WorldApp !== 'undefined'
);

export const isIotaAvailable = typeof window !== 'undefined' && !checkIsInSpecialApp();
```

#### 2. Update `src/contexts/IotaWalletContext.tsx`

Remove the mobile phone check - only skip IOTA providers in special apps:

```typescript
// Before
const isMobilePhone = typeof window !== 'undefined' && 
  /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isInSpecialApp = typeof window !== 'undefined' && (...);
if (isMobilePhone || isInSpecialApp) { return <>{children}</>; }

// After
const isInSpecialApp = typeof window !== 'undefined' && (
  !!(window as any).Telegram?.WebApp ||
  typeof (window as any).WorldApp !== 'undefined'
);
if (isInSpecialApp) { return <>{children}</>; }
```

#### 3. Update `src/components/IotaSubdomainMintModal.tsx`

Remove the mobile phone check from `isIotaWalletAvailable`:

```typescript
// Before
const isIotaWalletAvailable = typeof window !== 'undefined' && 
  !/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// After - use the centralized isIotaAvailable constant
const isIotaWalletAvailable = isIotaAvailable;
```

#### 4. Update `src/components/WalletConnection.tsx`

Remove mobile phone detection from the connection flow decision - mobile browsers should now show the IOTA connect modal:

The `handleTriggerConnect` already opens the IOTA modal for non-Telegram/non-World App environments, which is correct. Just need to ensure the modal renders on mobile.

#### 5. Update `src/components/HomeFeatureShowcase.tsx`

Reduce sizes for mobile screens:

| Element | Current Size | New Mobile Size |
|---------|-------------|-----------------|
| Hero Title | `text-4xl sm:text-5xl` | `text-3xl sm:text-5xl` |
| Subtitle | `text-base sm:text-lg` | `text-sm sm:text-lg` |
| Container padding | `pt-4 sm:pt-8` | `pt-2 sm:pt-8` |
| Content gap | `gap-5 sm:gap-6` | `gap-3 sm:gap-6` |
| Feature cards padding | `p-4` | `p-2.5 sm:p-4` |
| Feature icons | `w-12 h-12` | `w-10 h-10 sm:w-12 sm:h-12` |
| Comparison card padding | `p-5 sm:p-6` | `p-4 sm:p-6` |
| Avatar sizes | `w-11 h-11` | `w-9 h-9 sm:w-11 sm:h-11` |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-iota-wallet-safe.tsx` | Remove mobile phone check from `isIotaAvailable` |
| `src/contexts/IotaWalletContext.tsx` | Remove mobile phone check, only block special apps |
| `src/components/IotaSubdomainMintModal.tsx` | Use centralized `isIotaAvailable` instead of inline mobile check |
| `src/components/HomeFeatureShowcase.tsx` | Reduce element sizes for mobile viewport |

---

### Flow After Changes

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
    ┌─────────────────────────────────┐
    │  Desktop OR Mobile Browser      │
    │  → Shows IOTA Connect Modal     │
    │  → Works on both platforms now  │
    └─────────────────────────────────┘
```

---

### Preserved Functionality

- **World ID/World App**: Continues to use MiniKit wallet authentication (unchanged)
- **Telegram**: Continues to use TON wallet connection (unchanged)
- **Desktop browsers**: IOTA wallet connection (unchanged)
- **Mobile browsers**: NOW enabled for IOTA wallet connection

---

### Key Behavior Changes

1. Mobile phone users can now connect IOTA wallets via the dApp Kit modal
2. The "Desktop Required" message will no longer appear on mobile browsers
3. Home screen content will fit on mobile without scrolling
4. Only Telegram and World App users are routed to their dedicated wallet flows

