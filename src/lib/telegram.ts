// Telegram WebApp utilities for Mini App integration with TON Connect

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
