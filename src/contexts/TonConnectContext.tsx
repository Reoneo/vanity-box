import { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { getTonConnectManifest } from '@/lib/tonConnect';

interface TonConnectContextProps {
  children: ReactNode;
}

/**
 * TON Connect Provider - Always available but isolated
 * TON Connect is always initialized to prevent hook errors,
 * but should only be used in Telegram environments.
 * Payment flows check environment before using TON Connect.
 */
export const TonConnectProvider = ({ children }: TonConnectContextProps) => {
  console.log('[TonConnect] Initializing TON Connect UI Provider');
  return (
    <TonConnectUIProvider manifestUrl={getTonConnectManifest()}>
      {children}
    </TonConnectUIProvider>
  );
};
