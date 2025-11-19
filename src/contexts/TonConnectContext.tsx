import { createContext, useContext, ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { getTonConnectManifest } from '@/lib/tonConnect';
import { isTelegramWebView } from '@/lib/telegram';

interface TonConnectContextProps {
  children: ReactNode;
}

/**
 * Conditional TON Connect Provider
 * Only initializes TON Connect when in Telegram environment
 * This prevents conflicts with World App MiniKit
 */
export const TonConnectProvider = ({ children }: TonConnectContextProps) => {
  // Only provide TON Connect in Telegram WebView
  if (isTelegramWebView()) {
    console.log('[TonConnect] Initializing TON Connect UI (Telegram environment detected)');
    return (
      <TonConnectUIProvider manifestUrl={getTonConnectManifest()}>
        {children}
      </TonConnectUIProvider>
    );
  }

  // In non-Telegram environments, just render children without TON Connect
  console.log('[TonConnect] Skipping TON Connect UI (not in Telegram)');
  return <>{children}</>;
};
