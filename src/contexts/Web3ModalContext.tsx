import { ReactNode } from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { mainnet, worldchain } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Get WalletConnect project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Create a separate query client for wagmi (isolated from app's main query client)
const wagmiQueryClient = new QueryClient();

// App metadata for WalletConnect
const metadata = {
  name: 'Vanity.box',
  description: 'Your Web3 Identity Hub - Manage ENS, World ID, and blockchain domains',
  url: 'https://vanity.box',
  icons: ['https://vanity.box/vanity-box-logo.png']
};

// Define supported chains - mainnet and worldchain
const chains = [mainnet, worldchain] as const;

// Create wagmi config with connectors
const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [worldchain.id]: http(),
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
});

// Initialize Web3Modal only if projectId is available
if (projectId) {
  createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: false,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#D4AF37',
      '--w3m-border-radius-master': '12px',
    },
  });
}

interface Web3ModalProviderProps {
  children: ReactNode;
}

export const Web3ModalProvider = ({ children }: Web3ModalProviderProps) => {
  // If no project ID, just render children without wagmi wrapper
  // This prevents errors when WalletConnect isn't configured
  if (!projectId) {
    console.warn('[Web3Modal] No VITE_WALLETCONNECT_PROJECT_ID found, WalletConnect disabled');
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={wagmiQueryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export { config as wagmiConfig };
