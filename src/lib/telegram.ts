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
 * Uses multiple detection methods for maximum reliability across all devices including iPad
 */
export const isTelegramWebView = (): boolean => {
  // Method 1: Check for Telegram WebApp object
  const hasTelegramWebApp = !!(window as any).Telegram?.WebApp;
  
  // Method 2: Check for TelegramWebviewProxy (iOS specific)
  const hasTelegramWebviewProxy = !!(window as any).TelegramWebviewProxy;
  
  // Method 3: Check user agent for Telegram
  const userAgent = navigator.userAgent || '';
  const hasTelegramUA = userAgent.toLowerCase().includes('telegram');
  
  // Method 4: Check if initDataUnsafe exists (Telegram-specific)
  const hasInitData = !!(window as any).Telegram?.WebApp?.initDataUnsafe;
  
  // Method 5: Check URL parameters that Telegram passes
  const urlParams = new URLSearchParams(window.location.search);
  const hasTgWebAppData = urlParams.has('tgWebAppData') || urlParams.has('tgWebAppStartParam');
  
  // Method 6: Check for Telegram-specific window properties
  const hasTelegramGameProxy = !!(window as any).TelegramGameProxy;
  
  // Method 7: Check localStorage for Telegram data
  let hasTelegramStorage = false;
  try {
    hasTelegramStorage = localStorage.getItem('telegram-apps/launch-params') !== null;
  } catch (e) {
    // localStorage might not be available
  }
  
  const isTelegram = hasTelegramWebApp || 
                     hasTelegramWebviewProxy || 
                     hasTelegramUA || 
                     hasInitData || 
                     hasTgWebAppData || 
                     hasTelegramGameProxy ||
                     hasTelegramStorage;
  
  console.log('🔍 Telegram Detection (Enhanced for iPad):', {
    hasTelegramWebApp,
    hasTelegramWebviewProxy,
    hasTelegramUA,
    hasInitData,
    hasTgWebAppData,
    hasTelegramGameProxy,
    hasTelegramStorage,
    userAgent: userAgent.substring(0, 150),
    url: window.location.href,
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
