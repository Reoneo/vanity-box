/**
 * Hook for checking ENS name availability with onchain confirmation
 * Uses the ETH Registrar Controller's available() function
 */

import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData, decodeFunctionResult } from 'viem';
import { 
  ETH_REGISTRAR_CONTROLLER, 
  ETH_REGISTRAR_CONTROLLER_ABI,
  BASE_REGISTRAR,
  BASE_REGISTRAR_ABI,
  extractLabel, 
  validateLabel,
  labelhash,
  labelhashToTokenId,
  yearsToSeconds,
} from '@/lib/ens';

// Use fetch-based approach for reliable contract reads
async function callContract<T>(address: string, abi: readonly any[], functionName: string, args: any[] = []): Promise<T> {
  const data = encodeFunctionData({
    abi: abi as any,
    functionName,
    args,
  });

  const response = await fetch('https://eth.llamarpc.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: address, data }, 'latest'],
    }),
  });

  const json = await response.json();
  
  if (json.error) {
    throw new Error(json.error.message);
  }

  const result = decodeFunctionResult({
    abi: abi as any,
    functionName,
    data: json.result,
  });

  return result as T;
}

export type AvailabilityStatus = 'idle' | 'loading' | 'available' | 'taken' | 'invalid' | 'error';

interface AvailabilityResult {
  status: AvailabilityStatus;
  name: string;
  label: string;
  error?: string;
  expiryDate?: Date;
}

/**
 * Check ENS name availability with onchain confirmation
 * 
 * Strategy:
 * 1. Validate the label format
 * 2. Quick check via ETH Registrar Controller's available()
 * 3. If taken, get expiry date from Base Registrar
 */
export function useEnsAvailability(searchQuery: string): AvailabilityResult {
  const [result, setResult] = useState<AvailabilityResult>({
    status: 'idle',
    name: '',
    label: '',
  });

  const checkAvailability = useCallback(async (query: string) => {
    // Skip if empty
    if (!query || query.trim().length === 0) {
      setResult({ status: 'idle', name: '', label: '' });
      return;
    }

    // Extract label (remove .eth if present)
    const label = extractLabel(query.trim());
    const fullName = `${label}.eth`;

    // Validate the label
    const validation = validateLabel(label);
    if (!validation.valid) {
      setResult({
        status: 'invalid',
        name: fullName,
        label,
        error: validation.error,
      });
      return;
    }

    setResult({
      status: 'loading',
      name: fullName,
      label,
    });

    try {
      // === ONCHAIN CHECK: ETH Registrar Controller ===
      // This is the authoritative source for .eth availability
      const isAvailable = await callContract<boolean>(
        ETH_REGISTRAR_CONTROLLER,
        ETH_REGISTRAR_CONTROLLER_ABI,
        'available',
        [label]
      );

      if (isAvailable) {
        setResult({
          status: 'available',
          name: fullName,
          label,
        });
      } else {
        // Name is taken - get expiry date from Base Registrar
        let expiryDate: Date | undefined;
        try {
          const labelHash = labelhash(label);
          const tokenId = labelhashToTokenId(labelHash);
          
          const expiry = await callContract<bigint>(
            BASE_REGISTRAR,
            BASE_REGISTRAR_ABI,
            'nameExpires',
            [tokenId]
          );
          
          if (expiry > 0n) {
            expiryDate = new Date(Number(expiry) * 1000);
          }
        } catch (e) {
          console.warn('Failed to fetch expiry date:', e);
        }

        setResult({
          status: 'taken',
          name: fullName,
          label,
          expiryDate,
        });
      }
    } catch (error) {
      console.error('ENS availability check error:', error);
      setResult({
        status: 'error',
        name: fullName,
        label,
        error: 'Failed to check availability',
      });
    }
  }, []);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, checkAvailability]);

  return result;
}

/**
 * Get rent price for a name + duration
 */
export async function getEnsRentPrice(label: string, durationYears: number): Promise<{ base: bigint; premium: bigint; total: bigint }> {
  const durationSeconds = yearsToSeconds(durationYears);
  
  const price = await callContract<{ base: bigint; premium: bigint }>(
    ETH_REGISTRAR_CONTROLLER,
    ETH_REGISTRAR_CONTROLLER_ABI,
    'rentPrice',
    [label, durationSeconds]
  );

  return {
    base: price.base,
    premium: price.premium,
    total: price.base + price.premium,
  };
}

/**
 * Get minimum commitment age (wait time after commit)
 */
export async function getMinCommitmentAge(): Promise<number> {
  const age = await callContract<bigint>(
    ETH_REGISTRAR_CONTROLLER,
    ETH_REGISTRAR_CONTROLLER_ABI,
    'minCommitmentAge',
    []
  );
  return Number(age);
}

/**
 * Get maximum commitment age (commitment expiry)
 */
export async function getMaxCommitmentAge(): Promise<number> {
  const age = await callContract<bigint>(
    ETH_REGISTRAR_CONTROLLER,
    ETH_REGISTRAR_CONTROLLER_ABI,
    'maxCommitmentAge',
    []
  );
  return Number(age);
}

/**
 * Check if a commitment is valid (has been submitted and is in valid time window)
 */
export async function getCommitmentTimestamp(commitment: `0x${string}`): Promise<number> {
  const timestamp = await callContract<bigint>(
    ETH_REGISTRAR_CONTROLLER,
    ETH_REGISTRAR_CONTROLLER_ABI,
    'commitments',
    [commitment]
  );
  return Number(timestamp);
}
