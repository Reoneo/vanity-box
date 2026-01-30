import { useCurrentAccount, useDisconnectWallet } from '@iota/dapp-kit';
import { useMemo } from 'react';

// Check if we're on mobile phone or special app environment
// This is computed at module load time, so it's stable
const checkIsMobilePhone = () => typeof window !== 'undefined' && 
  /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const checkIsInSpecialApp = () => typeof window !== 'undefined' && (
  !!(window as any).Telegram?.WebApp ||
  typeof (window as any).WorldApp !== 'undefined'
);

// Compute once at module load
export const isIotaAvailable = typeof window !== 'undefined' && !checkIsMobilePhone() && !checkIsInSpecialApp();

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
