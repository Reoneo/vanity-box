import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useAccount } from "wagmi";

type ParaWalletContextValue = {
  isReady: boolean;
  isConnected: boolean;
  walletAddress: string | null;
  openModal: () => Promise<void>;
};

const ParaWalletContext = createContext<ParaWalletContextValue>({
  isReady: false,
  isConnected: false,
  walletAddress: null,
  openModal: async () => {
    console.warn("[Para] ParaWalletContext not ready yet (default no-op).");
  },
});

function tryOpenParaModal(): boolean {
  const w = window as any;

  // Common global shapes across Para builds
  const candidates: Array<(() => any) | undefined> = [
    w?.Para?.open,
    w?.Para?.openModal,
    w?.Para?.connect,
    w?.para?.open,
    w?.para?.openModal,
    w?.para?.connect,
    w?.getPara?.open,
    w?.getPara?.openModal,
    w?.getPara?.connect,
  ];

  for (const fn of candidates) {
    if (typeof fn === "function") {
      try {
        fn();
        return true;
      } catch (e) {
        console.warn("[Para] Found modal opener but it threw:", e);
      }
    }
  }

  return false;
}

export const ParaWalletContextProvider = ({ children }: { children: React.ReactNode }) => {
  // wagmi account state (EVM only)
  const { address, isConnected } = useAccount();

  const openModal = useCallback(async () => {
    // Only meant for web browsers; your WalletConnection already routes WorldApp/Telegram away.
    try {
      // 1) Try global modal openers (fast path)
      const opened = tryOpenParaModal();
      if (opened) return;

      // 2) If nothing exists, log what we can see so you can debug instantly
      const w = window as any;
      console.warn("[Para] No Para modal open method found on window.", {
        hasPara: !!w?.Para,
        haspara: !!w?.para,
        hasgetPara: !!w?.getPara,
        ParaKeys: w?.Para ? Object.keys(w.Para) : null,
        paraKeys: w?.para ? Object.keys(w.para) : null,
        getParaKeys: w?.getPara ? Object.keys(w.getPara) : null,
      });

      alert(
        "Para is not exposing a modal open method in this build. Open the console and paste the [Para] log output here and I’ll wire it to the exact API your build provides.",
      );
    } catch (e) {
      console.error("[Para] openModal failed:", e);
      alert("Failed to open Para modal. Check console logs.");
    }
  }, []);

  const value = useMemo<ParaWalletContextValue>(
    () => ({
      // If wagmi is mounted, we consider Para-wallet layer “ready” to attempt EVM connect
      isReady: true,
      isConnected: !!isConnected && !!address,
      walletAddress: address ?? null,
      openModal,
    }),
    [isConnected, address, openModal],
  );

  return <ParaWalletContext.Provider value={value}>{children}</ParaWalletContext.Provider>;
};

export const useParaWallet = () => useContext(ParaWalletContext);
