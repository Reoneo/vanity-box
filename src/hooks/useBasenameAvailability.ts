/**
 * useBasenameAvailability hook
 * Checks Basenames (.base.eth) availability on Base mainnet
 */

import { useState, useEffect, useRef } from 'react';
import { encodeFunctionData, decodeFunctionResult, keccak256, toHex } from 'viem';

// Basenames contract addresses on Base mainnet
export const BASENAMES_REGISTRAR_CONTROLLER = '0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5' as const;
export const BASENAMES_BASE_REGISTRAR = '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a' as const;
export const BASENAMES_L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as const;

const AVAILABLE_ABI = [{ name: 'available', type: 'function', stateMutability: 'view', inputs: [{ name: 'name', type: 'string' }], outputs: [{ name: '', type: 'bool' }] }] as const;
const REGISTER_PRICE_ABI = [{ name: 'registerPrice', type: 'function', stateMutability: 'view', inputs: [{ name: 'name', type: 'string' }, { name: 'duration', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] }] as const;
const NAME_EXPIRES_ABI = [{ name: 'nameExpires', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] }] as const;

interface CacheEntry { status: 'available' | 'taken'; expiryDate: Date | null; price: bigint | null; timestamp: number; }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60000;
const BASE_RPCS = ['https://mainnet.base.org', 'https://base.llamarpc.com', 'https://base.meowrpc.com'];
const ONE_YEAR_SECONDS = 31557600n;

async function rpcCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const response = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }) });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

function labelhash(label: string): `0x${string}` {
  return keccak256(toHex(label));
}

export type BasenameAvailabilityStatus = 'idle' | 'loading' | 'available' | 'taken' | 'invalid' | 'error';

export function useBasenameAvailability(searchQuery: string) {
  const [status, setStatus] = useState<BasenameAvailabilityStatus>('idle');
  const [name, setName] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [price, setPrice] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const checkAvailability = async () => {
      const raw = (searchQuery || '').trim().toLowerCase();
      if (!raw) { setStatus('idle'); setName(null); setLabel(null); return; }

      let extractedLabel = raw;
      if (raw.endsWith('.base.eth')) extractedLabel = raw.slice(0, -9);
      else if (raw.endsWith('.eth')) extractedLabel = raw.slice(0, -4);
      else if (raw.includes('.')) { setStatus('invalid'); return; }

      if (extractedLabel.length < 3 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(extractedLabel)) {
        setStatus('invalid'); setLabel(extractedLabel); setName(`${extractedLabel}.base.eth`); return;
      }

      const fullName = `${extractedLabel}.base.eth`;
      const currentRequestId = ++requestIdRef.current;
      setStatus('loading'); setLabel(extractedLabel); setName(fullName); setError(null);

      const cached = cache.get(extractedLabel);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        if (currentRequestId !== requestIdRef.current) return;
        setStatus(cached.status); setExpiryDate(cached.expiryDate); setPrice(cached.price); return;
      }

      for (const rpc of BASE_RPCS) {
        try {
          const availableData = encodeFunctionData({ abi: AVAILABLE_ABI, functionName: 'available', args: [extractedLabel] });
          const availableResult = await rpcCall(rpc, BASENAMES_REGISTRAR_CONTROLLER, availableData);
          if (currentRequestId !== requestIdRef.current) return;
          const isAvailable = decodeFunctionResult({ abi: AVAILABLE_ABI, functionName: 'available', data: availableResult as `0x${string}` }) as boolean;

          if (isAvailable) {
            const priceData = encodeFunctionData({ abi: REGISTER_PRICE_ABI, functionName: 'registerPrice', args: [extractedLabel, ONE_YEAR_SECONDS] });
            const priceResult = await rpcCall(rpc, BASENAMES_REGISTRAR_CONTROLLER, priceData);
            if (currentRequestId !== requestIdRef.current) return;
            const priceWei = decodeFunctionResult({ abi: REGISTER_PRICE_ABI, functionName: 'registerPrice', data: priceResult as `0x${string}` }) as bigint;
            setStatus('available'); setExpiryDate(null); setPrice(priceWei);
            cache.set(extractedLabel, { status: 'available', expiryDate: null, price: priceWei, timestamp: Date.now() });
          } else {
            const labelHashBigInt = BigInt(labelhash(extractedLabel));
            const expiryData = encodeFunctionData({ abi: NAME_EXPIRES_ABI, functionName: 'nameExpires', args: [labelHashBigInt] });
            const expiryResult = await rpcCall(rpc, BASENAMES_BASE_REGISTRAR, expiryData);
            if (currentRequestId !== requestIdRef.current) return;
            const expiryTimestamp = decodeFunctionResult({ abi: NAME_EXPIRES_ABI, functionName: 'nameExpires', data: expiryResult as `0x${string}` }) as bigint;
            const expiry = expiryTimestamp > 0n ? new Date(Number(expiryTimestamp) * 1000) : null;
            setStatus('taken'); setExpiryDate(expiry); setPrice(null);
            cache.set(extractedLabel, { status: 'taken', expiryDate: expiry, price: null, timestamp: Date.now() });
          }
          return;
        } catch (err: any) { console.warn(`Base RPC failed:`, err.message); }
      }
      if (currentRequestId === requestIdRef.current) { setStatus('error'); setError('Failed to check availability'); }
    };

    const debounceTimer = setTimeout(checkAvailability, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const priceFormatted = price !== null ? (Number(price) / 1e18).toFixed(6) : null;
  return { status, name, label, expiryDate, price, priceFormatted, error };
}
