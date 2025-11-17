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
 * Uses multiple detection methods for reliability
 */
export const isTelegramWebView = (): boolean => {
  // Method 1: Check for Telegram WebApp object
  const hasTelegramWebApp = !!(window as any).Telegram?.WebApp;
  
  // Method 2: Check user agent for Telegram
  const userAgent = navigator.userAgent || '';
  const hasTelegramUA = userAgent.includes('Telegram');
  
  // Method 3: Check if initDataUnsafe exists (Telegram-specific)
  const hasInitData = !!(window as any).Telegram?.WebApp?.initDataUnsafe;
  
  const isTelegram = hasTelegramWebApp || hasTelegramUA || hasInitData;
  
  console.log('🔍 Telegram Detection:', {
    hasTelegramWebApp,
    hasTelegramUA,
    hasInitData,
    userAgent: userAgent.substring(0, 100),
    result: isTelegram
  });
  
  return isTelegram;
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
