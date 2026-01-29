/**
 * Hook to check IOTA vanity.iota subdomain availability
 * Uses the IOTA Names SDK to query if a subdomain exists
 */

import { useState, useEffect } from 'react';
import { iotaJsonRpc, IOTA_NETWORK } from '@/lib/iota/client';

export type IotaSubdomainStatus = 'idle' | 'loading' | 'available' | 'taken' | 'invalid' | 'error';

export interface IotaSubdomainResult {
  status: IotaSubdomainStatus;
  expiryDate: Date | null;
  ownerAddress: string | null;
  error: string | null;
}

// Validate subdomain format: 3+ alphanumeric chars or hyphens, no leading/trailing hyphens
function isValidSubdomainLabel(label: string): boolean {
  if (!label || label.length < 3) return false; // Minimum 3 characters
  // Allow alphanumeric and hyphens, but not starting/ending with hyphen
  const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
  return pattern.test(label) && label.length <= 63;
}

/**
 * Check if a vanity.iota subdomain is available
 */
export function useIotaSubdomainAvailability(label: string): IotaSubdomainResult {
  const [status, setStatus] = useState<IotaSubdomainStatus>('idle');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset on label change
    setStatus('idle');
    setExpiryDate(null);
    setOwnerAddress(null);
    setError(null);

    const cleanLabel = (label || '').trim().toLowerCase();
    
    // Skip if empty or too short (minimum 3 characters)
    if (!cleanLabel || cleanLabel.length < 3) {
      if (cleanLabel.length > 0 && cleanLabel.length < 3) {
        setStatus('invalid');
        setError('Minimum 3 characters required');
      }
      return;
    }

    // Validate format
    if (!isValidSubdomainLabel(cleanLabel)) {
      setStatus('invalid');
      setError('Invalid subdomain format');
      return;
    }

    const checkAvailability = async () => {
      setStatus('loading');
      
      try {
        // Construct the full subdomain name
        const fullName = `${cleanLabel}.vanity.iota`;
        
        console.log(`[IOTA Subdomain] Checking availability: ${fullName}`);
        
        // Use iotax_iotaNamesLookup to check if name exists
        const result = await iotaJsonRpc<string | null>(
          'iotax_iotaNamesLookup',
          [fullName],
          IOTA_NETWORK
        );
        
        if (result && typeof result === 'string') {
          // Name exists (taken)
          console.log(`[IOTA Subdomain] ${fullName} is taken, owner: ${result}`);
          setOwnerAddress(result);
          setStatus('taken');
          
          // Try to get expiry info (if available)
          // For now, we don't have direct expiry info from lookup
        } else {
          // Name doesn't exist (available)
          console.log(`[IOTA Subdomain] ${fullName} is available`);
          setStatus('available');
        }
      } catch (err: any) {
        console.error('[IOTA Subdomain] Error checking availability:', err);
        
        // If the lookup fails with "name not found" type error, it's available
        if (err.message?.includes('not found') || err.message?.includes('does not exist')) {
          setStatus('available');
        } else {
          setError(err.message || 'Failed to check availability');
          setStatus('error');
        }
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkAvailability, 300);
    
    return () => clearTimeout(timeoutId);
  }, [label]);

  return { status, expiryDate, ownerAddress, error };
}

/**
 * Get the price for a vanity.iota subdomain in USD based on character length
 * Pricing: 3 chars = $300, 4 = $100, 5 = $50, 6-9 = $25, 10+ = $5
 * Minimum 3 characters required
 */
export function getSubdomainPriceUsd(label: string): number {
  const len = (label || '').trim().length;
  if (len < 3) return -1; // Invalid - minimum 3 characters
  if (len === 3) return 300;
  if (len === 4) return 100;
  if (len === 5) return 50;
  if (len >= 6 && len <= 9) return 25;
  return 5; // 10+ characters
}
