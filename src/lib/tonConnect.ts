// TON Connect integration for Telegram Mini App
import { THEME, TonConnectUI } from '@tonconnect/ui-react';

/**
 * Get TON Connect manifest URL
 */
export const getTonConnectManifest = (): string => {
  return 'https://vanity.box/tonconnect-manifest.json';
};

/**
 * Connect TON wallet and return wallet info
 */
export const connectTonWallet = async (tonConnectUI: TonConnectUI): Promise<{ address: string; username?: string }> => {
  try {
    // Check if already connected
    if (tonConnectUI.wallet) {
      return {
        address: tonConnectUI.wallet.account.address,
        username: tonConnectUI.wallet.account.address.slice(0, 6) + '...' + tonConnectUI.wallet.account.address.slice(-4)
      };
    }

    // Open the connection modal without triggering page reload
    const walletConnectionSource = await tonConnectUI.connectWallet();
    
    // Get the connected wallet
    const wallet = tonConnectUI.wallet;
    
    if (!wallet) {
      throw new Error('No wallet connected');
    }

    // Return wallet address
    return {
      address: wallet.account.address,
      username: wallet.account.address.slice(0, 6) + '...' + wallet.account.address.slice(-4)
    };
  } catch (error) {
    console.error('TON Connect error:', error);
    throw error;
  }
};

/**
 * Disconnect TON wallet
 */
export const disconnectTonWallet = async (tonConnectUI: TonConnectUI): Promise<void> => {
  try {
    await tonConnectUI.disconnect();
  } catch (error) {
    console.error('TON Disconnect error:', error);
    throw error;
  }
};
