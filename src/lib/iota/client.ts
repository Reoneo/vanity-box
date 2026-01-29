import { getFullnodeUrl } from '@iota/iota-sdk/client';

// IOTA network configuration
export type IotaNetwork = 'mainnet' | 'testnet' | 'devnet';

// Default to mainnet
export const IOTA_NETWORK: IotaNetwork = 
  (import.meta.env.VITE_IOTA_NETWORK as IotaNetwork) || 'mainnet';

// RPC endpoints for direct JSON-RPC calls
export const IOTA_RPC_ENDPOINTS: Record<IotaNetwork, string> = {
  mainnet: 'https://api.mainnet.iota.cafe',
  testnet: 'https://api.testnet.iota.cafe',
  devnet: 'https://api.devnet.iota.cafe',
};

export const getRpcEndpoint = (network: IotaNetwork = IOTA_NETWORK): string => {
  return IOTA_RPC_ENDPOINTS[network];
};

export const getFullnodeEndpoint = (network: IotaNetwork = IOTA_NETWORK): string => {
  return getFullnodeUrl(network);
};

// Validate IOTA address format (64 hex chars with 0x prefix)
export function isValidIotaAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/i.test(addr?.trim() || '');
}

// Normalize IOTA address (lowercase)
export function normalizeIotaAddress(addr: string): string | null {
  if (!isValidIotaAddress(addr)) return null;
  return addr.toLowerCase();
}

// JSON-RPC helper for direct calls
export async function iotaJsonRpc<T = unknown>(
  method: string,
  params: unknown[],
  network: IotaNetwork = IOTA_NETWORK
): Promise<T> {
  const endpoint = getRpcEndpoint(network);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || 'RPC call failed');
  }

  return data.result as T;
}
