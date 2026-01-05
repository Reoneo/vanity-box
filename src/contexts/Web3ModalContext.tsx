import { ReactNode } from "react";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Define World Chain manually (wagmi "Chain" compatible) ---
const worldchain = {
  id: 480,
  name: "World Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] },
  },
  blockExplorers: {
    default: { name: "World Chain Explorer", url: "https://worldscan.org" },
  },
} as const;

// --- WalletConnect Project ID (REQUIRED) ---
// IMPORTANT: If this is empty, Web3Modal hooks will throw.
// We fail fast so you see the real problem immediately.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;
if (!projectId) {
  throw new Error("Missing VITE_WALLETCONNECT_PROJECT_ID. Add it to your .env (and redeploy) to use Web3Modal.");
}

// --- App metadata for WalletConnect ---
const metadata = {
  name: "Vanity.box",
  description: "Your Web3 Identity Hub - Manage ENS, World ID, and blockchain domains",
  url: "https://vanity.box",
  icons: ["https://vanity.box/vanity-box-logo.png"],
};

// --- Supported chains ---
const chains = [mainnet, worldchain] as const;

// --- Wagmi config (wagmi v2) ---
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: false,
});

// --- Web3Modal must be created ONCE at module load (before hooks are used) ---
createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  enableAnalytics: false,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#D4AF37",
    "--w3m-border-radius-master": "12px",
  },
});

// --- Query client for react-query ---
const wagmiQueryClient = new QueryClient();

interface Web3ModalProviderProps {
  children: ReactNode;
}

export const Web3ModalProvider = ({ children }: Web3ModalProviderProps) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={wagmiQueryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};

export { wagmiConfig };
