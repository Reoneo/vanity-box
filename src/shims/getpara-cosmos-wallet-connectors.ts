import React from "react";

// EVM-only shim for @getpara/cosmos-wallet-connectors

export const CosmosExternalWalletContext = React.createContext<any>(null);

export function ParaCosmosProvider({ children }: { children: React.ReactNode }) {
  // Cosmos is intentionally disabled; just passthrough children.
  return React.createElement(React.Fragment, null, children);
}

// Wildcard exports in the real package are not used in our EVM-only setup.
