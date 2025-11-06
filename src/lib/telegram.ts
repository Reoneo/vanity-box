// Telegram WebApp utilities for Mini App integration

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  requestWalletAccess?: (callback: (result: any) => void) => void;
  initDataUnsafe: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
    };
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/**
 * Detect if running in Telegram WebView
 */
export const isTelegramWebView = (): boolean => {
  return !!(window as any).Telegram?.WebApp;
};

/**
 * Initialize Telegram WebApp
 */
export const initTelegramWebApp = () => {
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    return tg;
  }
  return null;
};

/**
 * Get Telegram user info
 */
export const getTelegramUser = () => {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return null;
  
  return tg.initDataUnsafe?.user || null;
};

/**
 * Connect TON wallet in Telegram
 * Note: This uses Telegram's built-in TON wallet
 */
export const connectTonWallet = async (): Promise<{ address: string; username?: string }> => {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) {
    throw new Error('Not in Telegram WebView');
  }
  
  // Get Telegram user info
  const telegramUser = getTelegramUser();
  
  // For now, we'll use Telegram user info
  // In a full implementation, this would request actual TON wallet access
  // using Telegram's wallet API when it's available
  
  if (telegramUser) {
    return {
      address: `telegram_${telegramUser.id}`,
      username: telegramUser.username || telegramUser.first_name || `User${telegramUser.id}`
    };
  }
  
  throw new Error('No Telegram user data available');
};
