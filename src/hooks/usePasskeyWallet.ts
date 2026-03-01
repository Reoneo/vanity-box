// usePasskeyWallet - React hook for passkey wallet operations

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

function getRpConfig() {
  const origin = window.location.origin;
  // Use the hostname as RP ID (registrable domain)
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
   * Flow: register-challenge → WebAuthn create → register-verify
   * Does NOT require an existing wallet address.
   */
  const createPasskeyWallet = useCallback(async (): Promise<boolean> => {
    setIsCreating(true);
    setError(null);
    setCurrentStep('passkey_create');

    try {
      const { origin, rpId } = getRpConfig();

      // For new passkey wallets, use a temporary identifier if no wallet connected
      const effectiveAddress = walletAddress || `passkey:${crypto.randomUUID()}`;

      // 1) Get registration challenge
      const challengeResponse = await callEdge<RegisterChallengeResponse>(
        'passkey-register-challenge',
        {
          walletAddress: effectiveAddress,
          origin,
          rpId,
          bindingLevel: 'passkey_wallet',
        }
      );

      if (!challengeResponse?.publicKeyOptions) {
        throw new Error('Failed to get registration challenge');
      }

      // 2) Create passkey
      const options = deserializeCreationOptions(challengeResponse.publicKeyOptions);
      const credential = await createPasskeyCredential(options);
      const serialized = serializeRegistrationCredential(credential);

      setCurrentStep('verifying');

      // 3) Verify with server
      const verifyResponse = await callEdge<{ ok: boolean; bindingId: string; walletAddress?: string }>(
        'passkey-register-verify',
        {
          bindSessionId: challengeResponse.bindSessionId,
          userId: (challengeResponse as any).userId,
          origin,
          rpId,
          credential: serialized,
          bindingLevel: 'passkey_wallet',
          walletAddress: effectiveAddress,
        }
      );

      if (!verifyResponse?.ok) {
        throw new Error('Server verification failed');
      }

      // Store the created wallet address for display
      setCreatedWalletAddress(verifyResponse.walletAddress || effectiveAddress);
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
      setError(err.message || 'Failed to login with passkey');
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
