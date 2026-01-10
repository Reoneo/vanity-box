import React, { useEffect } from 'react';
import { ParaProvider, Environment } from '@getpara/react-sdk-lite';
import '@getpara/react-sdk-lite/styles.css';
import { ParaConnectionBridge, useParaWallet } from '@/contexts/ParaWalletContext';
import { useParaConfig } from '@/hooks/useParaConfig';

interface ParaOnDemandWrapperProps {
  children: React.ReactNode;
  onConnectionChange?: (isConnected: boolean, address: string | null) => void;
}

/**
 * Wrapper that mounts ParaProvider only when paraEnabled is true in context.
 * Place this high in your component tree (e.g., in App.tsx).
 */
export const ParaOnDemandWrapper: React.FC<ParaOnDemandWrapperProps> = ({ 
  children,
  onConnectionChange 
}) => {
  const { paraEnabled } = useParaWallet();
  const { config, isLoading, error } = useParaConfig();

  // Not enabled - just render children
  if (!paraEnabled) {
    return <>{children}</>;
  }

  // Still loading config
  if (isLoading) {
    console.log('[ParaOnDemand] Loading Para config...');
    return <>{children}</>;
  }

  // Config error or missing API key
  if (error || !config?.paraApiKey) {
    console.warn('[ParaOnDemand] Para config error:', error || 'Missing API key');
    return <>{children}</>;
  }

  // Infer environment from API key
  const inferEnvironment = (apiKey: string): Environment => {
    const key = apiKey.trim().toLowerCase();
    if (key.startsWith('prod') || key.startsWith('pk_live') || key.includes('prod')) {
      return Environment.PROD;
    }
    return Environment.BETA;
  };

  const env = config.env === 'PROD' ? Environment.PROD : 
              config.env === 'BETA' ? Environment.BETA : 
              inferEnvironment(config.paraApiKey);

  console.log('[ParaOnDemand] Mounting ParaProvider with env:', env, 'key prefix:', config.paraApiKey.substring(0, 10));

  return (
    <ParaProvider
      paraClientConfig={{
        env,
        apiKey: config.paraApiKey,
      }}
      externalWalletConfig={{
        appName: 'Vanity.box',
        wallets: ['METAMASK', 'WALLETCONNECT', 'COINBASE', 'RAINBOW'],
        walletConnect: { projectId: config.walletConnectProjectId || '' },
      } as any}
      paraModalConfig={{
        logo: 'https://metadata.ens.domains/mainnet/avatar/odiin.eth?timestamp=1767661826173',
        oAuthMethods: ['GOOGLE', 'APPLE'],
        authLayout: ['AUTH:FULL', 'EXTERNAL:FULL'],
        recoverySecretStepEnabled: true,
        onRampTestMode: true,
      } as any}
      config={{ appName: 'Vanity.box' } as any}
    >
      <ParaConnectionBridge onConnectionChange={onConnectionChange}>
        {children}
      </ParaConnectionBridge>
    </ParaProvider>
  );
};

// Keep backward compatible export
export const ParaOnDemandProvider = ParaOnDemandWrapper;
