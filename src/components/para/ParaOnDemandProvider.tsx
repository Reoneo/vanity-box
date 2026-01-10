import React, { useEffect, useState } from 'react';
import { ParaProvider, Environment } from '@getpara/react-sdk-lite';
import '@getpara/react-sdk-lite/styles.css';
import { ParaWalletInnerProvider } from '@/contexts/ParaWalletContext';
import { useParaConfig } from '@/hooks/useParaConfig';

interface ParaOnDemandProviderProps {
  children: React.ReactNode;
  enabled: boolean;
  onReady?: () => void;
  onDisable?: () => void;
}

/**
 * Mounts ParaProvider only when `enabled` is true.
 * This ensures Para hooks are never called without a provider.
 */
export const ParaOnDemandProvider: React.FC<ParaOnDemandProviderProps> = ({
  children,
  enabled,
  onReady,
  onDisable,
}) => {
  const { config, isLoading, error } = useParaConfig();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (enabled && config?.paraApiKey && !isLoading) {
      console.log('[ParaOnDemand] Para is now enabled and configured');
      setIsReady(true);
      // Small delay to ensure provider is mounted before calling onReady
      const timer = setTimeout(() => {
        onReady?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [enabled, config, isLoading, onReady]);

  // If not enabled, just render children without Para
  if (!enabled) {
    return <>{children}</>;
  }

  // Still loading config
  if (isLoading) {
    console.log('[ParaOnDemand] Loading Para config...');
    return <>{children}</>;
  }

  // Config error or missing API key
  if (error || !config?.paraApiKey) {
    console.warn('[ParaOnDemand] Para config error or missing:', error);
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

  console.log('[ParaOnDemand] Mounting ParaProvider with env:', env);

  return (
    <ParaProvider
      paraClientConfig={{
        env,
        apiKey: config.paraApiKey,
      }}
      externalWalletConfig={{
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
      <ParaWalletInnerProvider onDisconnect={onDisable}>
        {children}
      </ParaWalletInnerProvider>
    </ParaProvider>
  );
};
