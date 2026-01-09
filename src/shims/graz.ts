// EVM-only build shim for `graz` (Cosmos hooks)
// This project does not support Cosmos. Any attempt to use these APIs should fail loudly.

export const GrazProvider = () => {
  throw new Error("Cosmos (graz) is not supported in this app (EVM-only build).");
};

// Commonly re-exported hook names (best-effort stubs)
export const useAccount = GrazProvider;
export const useConnect = GrazProvider;
export const useDisconnect = GrazProvider;
export const useCosmWasmClient = GrazProvider;

const defaultExport = {};
export default defaultExport;
