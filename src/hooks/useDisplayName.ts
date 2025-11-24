import { useState, useEffect } from 'react';
import { callEdge } from '@/lib/supaInvoke';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

type HexAddress = `0x${string}`;

/**
 * Hook to get the best display name for a wallet address
 * Priority:
 * 1. Primary ENS name (reverse record)
 * 2. Any ENS/world.id name that resolves to this wallet
 * 3. Hex address fallback
 */
export function useDisplayName(address?: HexAddress) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setDisplayName(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    async function fetchDisplayName() {
      try {
        // Step 1: Check for primary ENS name via reverse resolution
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(),
        });

        let primaryName: string | null = null;
        try {
          primaryName = await publicClient.getEnsName({
            address: address as HexAddress,
          });
        } catch (error) {
          console.log('No primary ENS name found via reverse lookup');
        }

        if (primaryName) {
          console.log('✅ Found primary ENS name:', primaryName);
          setDisplayName(primaryName);
          setIsLoading(false);
          return;
        }

        // Step 2: If no primary name, search for any owned ENS/world.id names
        console.log('🔍 Searching for any owned ENS/world.id names...');
        
        // Query The Graph for any domains resolving to this address
        const graphqlQuery = {
          query: `
            query Domains($address: String!) {
              domains(
                first: 10
                orderBy: createdAt
                orderDirection: desc
                where: {
                  resolvedAddress: $address
                }
              ) {
                name
              }
            }
          `,
          variables: {
            address: address.toLowerCase(),
          },
        };

        const graphRes = await fetch(
          'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(graphqlQuery),
            signal: controller.signal,
          }
        );

        if (graphRes.ok) {
          const json = await graphRes.json();
          const domains: string[] = json?.data?.domains?.map((d: any) => d.name) || [];

          // Prioritize world.id names over regular ENS
          const worldIdName = domains.find(name => name.endsWith('.world.id'));
          const fallbackName = worldIdName || domains[0];

          if (fallbackName) {
            console.log('✅ Found owned name via subgraph:', fallbackName);
            setDisplayName(fallbackName);
            setIsLoading(false);
            return;
          }
        }

        // Step 3: No ENS name found, return null (caller will use hex address)
        console.log('ℹ️ No ENS/world.id name found for address');
        setDisplayName(null);
        setIsLoading(false);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching display name:', error);
        }
        setDisplayName(null);
        setIsLoading(false);
      }
    }

    fetchDisplayName();

    return () => controller.abort();
  }, [address]);

  return { displayName, isLoading };
}
