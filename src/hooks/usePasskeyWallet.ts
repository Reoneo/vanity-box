// usePasskeyWallet - React hook for passkey wallet operations
// Now derives real IOTA addresses from passkey P-256 public keys

import { useState, useCallback, useEffect } from 'react';
import { callEdge } from '@/lib/supaInvoke';
import {
  isWebAuthnAvailable,
  isPlatformAuthenticatorAvailable,
  createPasskeyCredential,
  getPasskeyAssertion,
  serializeRegistrationCredential,
  serializeAssertionCredential,
  b64urlDecode,
} from '@/lib/passkey/webauthn';
import { normalizeToCompressed33 } from '@/lib/passkey/keyNormalization';
import { derivePasskeyIotaAddress } from '@/lib/iota/passkeyAddress';
import type {
  PasskeyBinding,
  PasskeyFlowStep,
  BindChallengeResponse,
  RegisterChallengeResponse,
  LoginChallengeResponse,
  LoginVerifyResponse,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@/types/passkey';

/** Returns true if `value` looks like a real on-chain address (not a placeholder). */
export function isValidIotaAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  // Reject known placeholders
  if (/^passkey/i.test(v) || /^wallet$/i.test(v) || /^user$/i.test(v) || /^unknown$/i.test(v) || /^pending/i.test(v)) return false;
  // Accept 0x-prefixed hex (≥ 20 chars) or iota1/smr1 bech32 (≥ 20 chars)
  if (/^0x[0-9a-fA-F]{8,}$/.test(v)) return true;
  if (/^(iota1|smr1)[a-z0-9]{10,}$/.test(v)) return true;
  // Accept any string ≥ 20 chars as a likely address
  if (v.length >= 20) return true;
  return false;
}

function getRpConfig() {
  const origin = window.location.origin;
  const rpId = window.location.hostname;
  return { origin, rpId };
}

function deserializeCreationOptions(
  json: PublicKeyCredentialCreationOptionsJSON
): PublicKeyCredentialCreationOptions {
  return {
    ...json,
    challenge: b64urlDecode(json.challenge).buffer as ArrayBuffer,
    user: {
      ...json.user,
      id: b64urlDecode(json.user.id).buffer as ArrayBuffer,
    },
    pubKeyCredParams: json.pubKeyCredParams.map((p) => ({
      type: p.type as PublicKeyCredentialType,
      alg: p.alg,
    })),
    authenticatorSelection: {
      residentKey: json.authenticatorSelection.residentKey as ResidentKeyRequirement,
      requireResidentKey: json.authenticatorSelection.requireResidentKey,
      userVerification: json.authenticatorSelection.userVerification as UserVerificationRequirement,
    },
    attestation: json.attestation as AttestationConveyancePreference,
    excludeCredentials: json.excludeCredentials?.map((c) => ({
      id: b64urlDecode(c.id).buffer as ArrayBuffer,
      type: c.type as PublicKeyCredentialType,
      transports: c.transports as AuthenticatorTransport[],
    })),
  };
}

function deserializeRequestOptions(
  json: PublicKeyCredentialRequestOptionsJSON
): PublicKeyCredentialRequestOptions {
  return {
    challenge: b64urlDecode(json.challenge).buffer as ArrayBuffer,
    rpId: json.rpId,
    allowCredentials: json.allowCredentials?.map((c) => ({
      id: b64urlDecode(c.id).buffer as ArrayBuffer,
      type: c.type as PublicKeyCredentialType,
      transports: c.transports as AuthenticatorTransport[],
    })),
    userVerification: json.userVerification as UserVerificationRequirement,
    timeout: json.timeout,
  };
}

/**
 * Extract the compressed P-256 public key from a WebAuthn registration credential.
 * Tries getPublicKey() (SPKI DER) first, falls back to attestation COSE key.
 */
function extractCompressedPubKey(credential: PublicKeyCredential): Uint8Array | null {
  const response = credential.response as AuthenticatorAttestationResponse;

  // Method 1: getPublicKey() returns SPKI DER (91 bytes)
  if (typeof response.getPublicKey === 'function') {
    const spki = response.getPublicKey();
    if (spki) {
      try {
        return normalizeToCompressed33(new Uint8Array(spki));
      } catch (e) {
        console.warn('[Passkey] Failed to normalize SPKI key:', e);
      }
    }
  }

  // Method 2: Parse from attestation object authData (fallback)
  // The server will also do this, so it's OK if we can't extract client-side
  console.warn('[Passkey] getPublicKey() unavailable, server will derive address');
  return null;
}

export function usePasskeyWallet(walletAddress?: string | null) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPlatformAuth, setHasPlatformAuth] = useState(false);
  const [bindings, setBindings] = useState<PasskeyBinding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<PasskeyFlowStep>('idle');
  const [createdWalletAddress, setCreatedWalletAddress] = useState<string | null>(null);

  // Check WebAuthn availability
  useEffect(() => {
    const check = async () => {
      const available = isWebAuthnAvailable();
      setIsAvailable(available);
      if (available) {
        const platform = await isPlatformAuthenticatorAvailable();
        setHasPlatformAuth(platform);
      }
    };
    check();
  }, []);

  // Load existing bindings
  const loadBindings = useCallback(async () => {
    const addr = walletAddress || createdWalletAddress;
    if (!addr) return;
    setIsLoading(true);
    try {
      const result = await callEdge<PasskeyBinding[]>('passkey-get-bindings', {
        walletAddress: addr,
      });
      if (result && Array.isArray(result)) {
        setBindings(result);
      }
    } catch (err: any) {
      console.error('Failed to load passkey bindings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, createdWalletAddress]);

  /**
   * Create a new passkey-backed IOTA wallet.
   * Flow: register-challenge → WebAuthn create → extract pubkey → derive address → register-verify
   * The IOTA address is derived from the passkey's P-256 public key using blake2b.
   */
  const createPasskeyWallet = useCallback(async (): Promise<boolean> => {
    setIsCreating(true);
    setError(null);
    setCurrentStep('passkey_create');

    try {
      const { origin, rpId } = getRpConfig();

      // For new passkey wallets, use a pending marker for the challenge.
      // The real address is derived after credential creation from the public key.
      const challengeAddress = walletAddress || 'pending_passkey_create';

      // 1) Get registration challenge
      const challengeResponse = await callEdge<RegisterChallengeResponse>(
        'passkey-register-challenge',
        {
          walletAddress: challengeAddress,
          origin,
          rpId,
          bindingLevel: 'passkey_wallet',
          userName: 'Vanity.box Wallet',
          userDisplayName: 'IOTA Passkey Wallet',
        }
      );

      if (!challengeResponse?.publicKeyOptions) {
        throw new Error('Failed to get registration challenge');
      }

      // 2) Create passkey credential
      const options = deserializeCreationOptions(challengeResponse.publicKeyOptions);
      const credential = await createPasskeyCredential(options);

      // 3) Extract public key and derive real IOTA address
      const compressedPubKey = extractCompressedPubKey(credential);
      let clientDerivedAddress: string | null = null;
      if (compressedPubKey) {
        clientDerivedAddress = derivePasskeyIotaAddress(compressedPubKey);
        console.log('[Passkey] Client-derived IOTA address:', clientDerivedAddress);
      }

      const serialized = serializeRegistrationCredential(credential);

      setCurrentStep('verifying');

      // 4) Verify with server — send derived address (server will also derive independently)
      const verifyResponse = await callEdge<{
        ok: boolean;
        bindingId: string;
        walletAddress?: string;
        derivedAddress?: string;
      }>(
        'passkey-register-verify',
        {
          bindSessionId: challengeResponse.bindSessionId,
          userId: (challengeResponse as any).userId,
          origin,
          rpId,
          credential: serialized,
          bindingLevel: 'passkey_wallet',
          walletAddress: clientDerivedAddress || challengeAddress,
        }
      );

      if (!verifyResponse?.ok) {
        throw new Error('Server verification failed');
      }

      // 5) Use the server-derived address (authoritative), falling back to client-derived
      const finalAddress = verifyResponse.derivedAddress || verifyResponse.walletAddress || clientDerivedAddress;

      if (!finalAddress || !isValidIotaAddress(finalAddress)) {
        console.error('[Passkey] No valid IOTA address derived. Server response:', verifyResponse);
        throw new Error('Failed to derive a valid IOTA address from passkey');
      }

      console.log('[Passkey] Final IOTA address:', finalAddress);
      setCreatedWalletAddress(finalAddress);
      setCurrentStep('complete');
      return true;
    } catch (err: any) {
      console.error('Passkey wallet creation error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Passkey creation was cancelled');
      } else {
        setError(err.message || 'Failed to create passkey wallet');
      }
      setCurrentStep('error');
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress]);

  /**
   * Bind an existing extension wallet to a passkey.
   * Flow: bind-challenge → wallet sign → verify-wallet → register-challenge → WebAuthn create → register-verify
   */
  const bindExistingWallet = useCallback(
    async (signPersonalMessage: (message: Uint8Array) => Promise<{ signature: string }>): Promise<boolean> => {
      if (!walletAddress) {
        setError('Connect your IOTA wallet extension first');
        return false;
      }

      setIsBinding(true);
      setError(null);
      setCurrentStep('wallet_proof');

      try {
        const { origin, rpId } = getRpConfig();

        // 1) Get bind challenge
        const bindChallenge = await callEdge<BindChallengeResponse>(
          'passkey-bind-challenge',
          { walletAddress, origin, rpId }
        );

        if (!bindChallenge?.message) {
          throw new Error('Failed to get bind challenge');
        }

        // 2) Sign with wallet extension
        const messageBytes = new TextEncoder().encode(bindChallenge.message);
        const { signature } = await signPersonalMessage(messageBytes);

        // 3) Verify wallet proof
        const verifyResult = await callEdge<{ ok: boolean; walletProof: any }>(
          'passkey-verify-wallet',
          {
            walletAddress,
            bindSessionId: bindChallenge.bindSessionId,
            nonce: bindChallenge.nonce,
            message: bindChallenge.message,
            signature,
            origin,
            rpId,
          }
        );

        if (!verifyResult?.ok) {
          throw new Error('Wallet verification failed');
        }

        setCurrentStep('passkey_create');

        // 4) Get registration challenge
        const regChallenge = await callEdge<RegisterChallengeResponse>(
          'passkey-register-challenge',
          {
            walletAddress,
            origin,
            rpId,
            bindSessionId: bindChallenge.bindSessionId,
            bindingLevel: 'existing_wallet_link',
          }
        );

        if (!regChallenge?.publicKeyOptions) {
          throw new Error('Failed to get registration challenge');
        }

        // 5) Create passkey
        const options = deserializeCreationOptions(regChallenge.publicKeyOptions);
        const credential = await createPasskeyCredential(options);
        const serialized = serializeRegistrationCredential(credential);

        setCurrentStep('verifying');

        // 6) Verify registration
        const regVerify = await callEdge<{ ok: boolean; bindingId: string }>(
          'passkey-register-verify',
          {
            bindSessionId: regChallenge.bindSessionId,
            userId: (regChallenge as any).userId,
            origin,
            rpId,
            credential: serialized,
            bindingLevel: 'existing_wallet_link',
            walletAddress,
            walletProofHashes: verifyResult.walletProof,
          }
        );

        if (!regVerify?.ok) {
          throw new Error('Registration verification failed');
        }

        setCurrentStep('complete');
        await loadBindings();
        return true;
      } catch (err: any) {
        console.error('Wallet binding error:', err);
        setError(err.message || 'Failed to bind wallet');
        setCurrentStep('error');
        return false;
      } finally {
        setIsBinding(false);
      }
    },
    [walletAddress, loadBindings]
  );

  /**
   * Login with passkey.
   * Flow: login-challenge → WebAuthn get → login-verify
   * The server returns the real IOTA address from the binding (auto-migrates old placeholders).
   */
  const loginWithPasskey = useCallback(async (): Promise<PasskeyBinding | null> => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const { origin, rpId } = getRpConfig();

      // 1) Get login challenge
      const challenge = await callEdge<LoginChallengeResponse>(
        'passkey-login-challenge',
        { walletAddress: walletAddress || null, origin, rpId }
      );

      if (!challenge?.publicKeyOptions) {
        throw new Error('Failed to get login challenge');
      }

      // 2) Get assertion
      const options = deserializeRequestOptions(challenge.publicKeyOptions);
      const assertion = await getPasskeyAssertion(options);
      const serialized = serializeAssertionCredential(assertion);

      // 3) Verify
      const result = await callEdge<LoginVerifyResponse>(
        'passkey-login-verify',
        {
          challengeSessionId: challenge.challengeSessionId,
          origin,
          rpId,
          credential: serialized,
        }
      );

      if (!result?.ok) {
        throw new Error('Login verification failed');
      }

      await loadBindings();
      return result.binding;
    } catch (err: any) {
      console.error('Passkey login error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled');
      } else {
        setError(err.message || 'Failed to login with passkey');
      }
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [walletAddress, loadBindings]);

  /**
   * Unbind / revoke a passkey binding.
   */
  const unbindPasskey = useCallback(async (bindingId: string, reason: string = 'user_requested'): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await callEdge<{ ok: boolean }>('passkey-unbind', {
        bindingId,
        reason,
        actor: { walletAddress },
      });

      if (!result?.ok) {
        throw new Error('Unbind failed');
      }

      await loadBindings();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to unbind passkey');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, loadBindings]);

  const resetError = useCallback(() => {
    setError(null);
    setCurrentStep('idle');
  }, []);

  return {
    isAvailable,
    hasPlatformAuth,
    bindings,
    isLoading,
    isCreating,
    isBinding,
    isAuthenticating,
    error,
    currentStep,
    createdWalletAddress,
    createPasskeyWallet,
    bindExistingWallet,
    loginWithPasskey,
    unbindPasskey,
    loadBindings,
    resetError,
  };
}
