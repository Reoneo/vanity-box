/**
 * useVanityVerification
 * Hook to verify .vanity domain ownership and mint matching .vanity.iota subdomains.
 */
import { useState, useCallback } from 'react';

const SUPA_URL = "https://gdjjboorqviobvvygpca.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE";

interface VanityDomainResult {
  domains: string[];
  count: number;
}

interface MintResult {
  ok: boolean;
  subdomain?: string;
  fullName?: string;
  vanityBoxUrl?: string;
  profileUrl?: string;
  error?: string;
}

type VerifyStep = 'idle' | 'verifying' | 'verified' | 'minting' | 'minted' | 'error';

async function edgeFetch<T>(name: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPA_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPA_ANON,
      Authorization: `Bearer ${SUPA_ANON}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Edge function ${name} returned ${res.status}`);
  return res.json();
}

export function useVanityVerification() {
  const [step, setStep] = useState<VerifyStep>('idle');
  const [vanityDomains, setVanityDomains] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mintedDomain, setMintedDomain] = useState<MintResult | null>(null);

  const verifyOwnership = useCallback(async (evmAddress: string) => {
    if (!evmAddress) {
      setError('No EVM wallet address available');
      return;
    }

    setStep('verifying');
    setError(null);
    setVanityDomains([]);

    try {
      const result = await edgeFetch<{ ok: boolean; domains?: string[]; error?: string }>(
        'verify-vanity-ownership',
        { walletAddress: evmAddress },
      );

      if (!result.ok) {
        setError(result.error || 'Verification failed');
        setStep('error');
        return;
      }

      const domains = result.domains || [];
      setVanityDomains(domains);
      setStep(domains.length > 0 ? 'verified' : 'verified');
    } catch (err: any) {
      console.error('[useVanityVerification] Error:', err);
      setError(err?.message || 'Failed to verify .vanity ownership');
      setStep('error');
    }
  }, []);

  const mintSubdomain = useCallback(async (vanityDomain: string, iotaAddress: string, evmAddress: string) => {
    setStep('minting');
    setError(null);

    try {
      const result = await edgeFetch<MintResult>(
        'mint-vanity-subdomain-sponsored',
        { vanityDomain, iotaAddress, evmAddress },
      );

      if (!result.ok) {
        setError(result.error || 'Minting failed');
        setStep('error');
        return;
      }

      setMintedDomain(result);
      setStep('minted');
    } catch (err: any) {
      console.error('[useVanityVerification] Mint error:', err);
      setError(err?.message || 'Failed to mint subdomain');
      setStep('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setVanityDomains([]);
    setError(null);
    setMintedDomain(null);
  }, []);

  return {
    step,
    vanityDomains,
    error,
    mintedDomain,
    verifyOwnership,
    mintSubdomain,
    reset,
  };
}
