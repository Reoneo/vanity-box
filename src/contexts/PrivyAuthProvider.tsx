import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'your-privy-app-id';

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#000000',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
