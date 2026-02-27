import { useCurrentAccount, useDisconnectWallet, useSignAndExecuteTransaction } from '@iota/dapp-kit';

// Check if we're in a special app environment (Telegram, World App)
// These have their own wallet flows, so IOTA wallet is not available there
// Mobile browsers are now supported for IOTA wallet connection
const checkIsInSpecialApp = () => typeof window !== 'undefined' && (
  !!(window as any).Telegram?.WebApp ||
  typeof (window as any).WorldApp !== 'undefined'
);

// Compute once at module load - only block in special apps
export const isIotaAvailable = typeof window !== 'undefined' && !checkIsInSpecialApp();

// Safe wrapper hooks that return null/noop on mobile
// These hooks are safe to call unconditionally - they just won't use IOTA hooks on mobile
export function useIotaAccountSafe() {
  // On mobile, we don't have the IOTA provider, so return null
  if (!isIotaAvailable) {
    return null;
  }
  
  // On desktop, use the actual IOTA hook
  // The conditional is on a module-level constant, so hook rules are satisfied
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCurrentAccount();
}

export function useIotaDisconnectSafe() {
  // On mobile, return a no-op
  if (!isIotaAvailable) {
    return { mutate: () => {} };
  }
  
  // On desktop, use the actual IOTA hook
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useDisconnectWallet();
}

export function useSignAndExecuteTransactionSafe() {
  if (!isIotaAvailable) {
    return { mutate: (() => {}) as any, mutateAsync: (async () => {}) as any, isPending: false };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSignAndExecuteTransaction();
}
