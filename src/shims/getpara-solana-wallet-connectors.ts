import React from "react";

// EVM-only shim for @getpara/solana-wallet-connectors

export const SolanaExternalWalletContext = React.createContext<any>(null);

export function ParaSolanaProvider({ children }: { children: React.ReactNode }) {
  // Solana is intentionally disabled; just passthrough children.
  return React.createElement(React.Fragment, null, children);
}

// Wildcard exports in the real package are not used in our EVM-only setup.
