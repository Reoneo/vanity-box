import { useCallback, useEffect, useState } from 'react';

export type SupportedChain = 'ethereum' | 'ton' | 'aptos' | 'sui';

export interface LinkedWallet {
  chain: SupportedChain;
  address: string;
  verified: boolean;
}

const STORAGE_KEY = (iotaName: string) =>
  `vanity_unverified_wallets:${iotaName.toLowerCase()}`;

interface UnverifiedMap {
  ethereum: string[];
  ton: string[];
  aptos: string[];
  sui: string[];
}

const EMPTY: UnverifiedMap = { ethereum: [], ton: [], aptos: [], sui: [] };

function load(iotaName: string): UnverifiedMap {
  if (!iotaName) return { ...EMPTY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY(iotaName));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    return {
      ethereum: Array.isArray(parsed.ethereum) ? parsed.ethereum : [],
      ton: Array.isArray(parsed.ton) ? parsed.ton : [],
      aptos: Array.isArray(parsed.aptos) ? parsed.aptos : [],
      sui: Array.isArray(parsed.sui) ? parsed.sui : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function persist(iotaName: string, map: UnverifiedMap) {
  if (!iotaName) return;
  try {
    localStorage.setItem(STORAGE_KEY(iotaName), JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent('vanity-unverified-wallets-changed', {
        detail: { iotaName: iotaName.toLowerCase() },
      }),
    );
  } catch {}
}

/**
 * Manages manually-added (unverified) wallet addresses per profile.
 * Verified wallets continue to live in the IdentityContext VC list.
 */
export function useLinkedWallets(iotaName: string) {
  const [unverified, setUnverified] = useState<UnverifiedMap>(() =>
    load(iotaName),
  );

  useEffect(() => {
    setUnverified(load(iotaName));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.iotaName === iotaName.toLowerCase()) {
        setUnverified(load(iotaName));
      }
    };
    window.addEventListener('vanity-unverified-wallets-changed', onChange);
    return () =>
      window.removeEventListener(
        'vanity-unverified-wallets-changed',
        onChange,
      );
  }, [iotaName]);

  const add = useCallback(
    (chain: SupportedChain, address: string) => {
      const cleaned = address.trim();
      if (!cleaned) return;
      const next = { ...unverified };
      const list = [...next[chain]];
      if (!list.some((a) => a.toLowerCase() === cleaned.toLowerCase())) {
        list.push(cleaned);
      }
      next[chain] = list;
      persist(iotaName, next);
      setUnverified(next);
    },
    [iotaName, unverified],
  );

  const remove = useCallback(
    (chain: SupportedChain, address: string) => {
      const next = { ...unverified };
      next[chain] = next[chain].filter(
        (a) => a.toLowerCase() !== address.toLowerCase(),
      );
      persist(iotaName, next);
      setUnverified(next);
    },
    [iotaName, unverified],
  );

  const isVerified = useCallback(
    (address: string, verifiedAddresses: string[]) =>
      verifiedAddresses.some(
        (a) => a.toLowerCase() === address.toLowerCase(),
      ),
    [],
  );

  return { unverified, add, remove, isVerified };
}

export function getUnverifiedAddresses(
  iotaName: string,
  chain: SupportedChain,
): string[] {
  return load(iotaName)[chain];
}
