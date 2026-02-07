import { getFullnodeUrl } from '@iota/iota-sdk/client';

// IOTA network configuration
export type IotaNetwork = 'mainnet' | 'testnet' | 'devnet';

// Default to mainnet
export const IOTA_NETWORK: IotaNetwork = 
  (import.meta.env.VITE_IOTA_NETWORK as IotaNetwork) || 'mainnet';

// RPC endpoints for direct JSON-RPC calls (general IOTA operations)
export const IOTA_RPC_ENDPOINTS: Record<IotaNetwork, string> = {
  mainnet: 'https://api.mainnet.iota.cafe',
  testnet: 'https://api.testnet.iota.cafe',
  devnet: 'https://api.devnet.iota.cafe',
};

// Indexer endpoints for IOTA Names resolution (preferred for name lookups)
export const IOTA_INDEXER_ENDPOINTS: Record<IotaNetwork, string> = {
  mainnet: 'https://indexer.mainnet.iota.cafe',
  testnet: 'https://indexer.testnet.iota.cafe',
  devnet: 'https://indexer.devnet.iota.cafe',
};

export const getRpcEndpoint = (network: IotaNetwork = IOTA_NETWORK): string => {
  return IOTA_RPC_ENDPOINTS[network];
};

export const getIndexerEndpoint = (network: IotaNetwork = IOTA_NETWORK): string => {
  return IOTA_INDEXER_ENDPOINTS[network];
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

// IOTA Names-specific methods that require the indexer
const INDEXER_METHODS = [
  'iotax_iotaNamesLookup',
  'iotax_iotaNamesReverseLookup',
];

// JSON-RPC helper for direct calls
// Automatically routes IOTA Names methods to the indexer endpoint
export async function iotaJsonRpc<T = unknown>(
  method: string,
  params: unknown[],
  network: IotaNetwork = IOTA_NETWORK
): Promise<T> {
  // Use indexer for IOTA Names methods, RPC for everything else
  const useIndexer = INDEXER_METHODS.includes(method);
  const primaryEndpoint = useIndexer ? getIndexerEndpoint(network) : getRpcEndpoint(network);
  const fallbackEndpoint = useIndexer ? getRpcEndpoint(network) : getIndexerEndpoint(network);
  
  const endpoints = [primaryEndpoint, fallbackEndpoint];
  let lastError: Error | null = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 IOTA RPC: ${method} -> ${endpoint}`);
      
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
        console.error(`❌ RPC request to ${endpoint} failed: ${response.status}`);
        lastError = new Error(`RPC request failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.error) {
        console.error(`❌ RPC error from ${endpoint}: ${data.error.message}`);
        lastError = new Error(data.error.message || 'RPC call failed');
        continue;
      }

      console.log(`✅ IOTA RPC success: ${method} via ${endpoint}`);
      return data.result as T;
    } catch (err: any) {
      console.error(`❌ Network error with ${endpoint}:`, err.message);
      lastError = err;
      continue;
    }
  }
  
  throw lastError || new Error('All RPC endpoints failed');
}
