// WebAuthn helpers for passkey bind and login flows

import { callEdge } from '@/lib/supaInvoke';

/** Check if WebAuthn is supported in this browser */
export function isWebAuthnSupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials?.create &&
    navigator.credentials?.get
  );
}

/** Check if platform authenticator (Face ID / Touch ID / Windows Hello) is available */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function base64urlToBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

interface PasskeyChallengeResponse {
  challenge: string;
  expiresAt: string;
  hasExistingPasskey: boolean;
}

interface PasskeyRegisterResult {
  success: boolean;
  credentialId: string;
  iotaWalletAddress: string;
  message: string;
}

interface PasskeyLoginResult {
  success: boolean;
  iotaWalletAddress: string;
  credentialId: string;
  message: string;
}

interface PasskeyStatusResult {
  hasBoundPasskey: boolean;
  bindings: Array<{
    id: string;
    credential_id: string;
    created_at: string;
    last_used_at: string | null;
    rp_id: string;
  }>;
}

/** Get rpId based on current origin */
function getRpId(): string {
  const hostname = window.location.hostname;
  if (hostname === 'vanity.box' || hostname === 'www.vanity.box') return 'vanity.box';
  if (hostname.endsWith('.lovable.app')) return hostname;
  return hostname; // localhost etc
}

/**
 * Step 1 of bind flow: Request a challenge from the server
 */
export async function requestBindChallenge(iotaWalletAddress: string): Promise<PasskeyChallengeResponse> {
  return callEdge<PasskeyChallengeResponse>('passkey-challenge', {
    type: 'wallet_bind',
    iotaWalletAddress,
  });
}

/**
 * Step 2 of bind flow: Create WebAuthn credential (passkey) using platform authenticator
 */
export async function createPasskeyCredential(
  iotaWalletAddress: string,
  challenge: string
): Promise<PublicKeyCredential> {
  const rpId = getRpId();

  // Use wallet address as user ID (hashed)
  const userIdBytes = new TextEncoder().encode(iotaWalletAddress);
  const userIdHash = await crypto.subtle.digest('SHA-256', userIdBytes);

  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64urlToBuffer(challenge),
    rp: {
      name: 'Vanity.box',
      id: rpId,
    },
    user: {
      id: new Uint8Array(userIdHash),
      name: `IOTA:${iotaWalletAddress.slice(0, 10)}...${iotaWalletAddress.slice(-6)}`,
      displayName: `IOTA Wallet ${iotaWalletAddress.slice(0, 10)}...`,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
      requireResidentKey: false,
    },
    timeout: 120000,
    attestation: 'none',
  };

  const credential = await navigator.credentials.create({
    publicKey: createOptions,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Passkey creation was cancelled');
  }

  return credential;
}

/**
 * Step 3 of bind flow: Send attestation to server for verification and storage
 */
export async function registerPasskey(
  iotaWalletAddress: string,
  walletChallenge: string,
  walletSignature: string,
  walletMessage: string,
  credential: PublicKeyCredential
): Promise<PasskeyRegisterResult> {
  const response = credential.response as AuthenticatorAttestationResponse;

  const attestationResponse = {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      attestationObject: bufferToBase64url(response.attestationObject),
    },
  };

  return callEdge<PasskeyRegisterResult>('passkey-register', {
    iotaWalletAddress,
    walletChallenge,
    walletSignature,
    walletMessage,
    attestationResponse,
    rpId: getRpId(),
  });
}

/**
 * Login with passkey: request challenge, get assertion, verify on server
 */
export async function loginWithPasskey(): Promise<PasskeyLoginResult> {
  // 1. Get login challenge
  const { challenge } = await callEdge<PasskeyChallengeResponse>('passkey-challenge', {
    type: 'webauthn_login',
  });

  const rpId = getRpId();

  // 2. Get assertion
  const assertionOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToBuffer(challenge),
    rpId,
    userVerification: 'required',
    timeout: 120000,
  };

  const credential = await navigator.credentials.get({
    publicKey: assertionOptions,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Passkey authentication was cancelled');
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  const assertionResponse = {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      authenticatorData: bufferToBase64url(response.authenticatorData),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
    },
  };

  // 3. Verify on server
  return callEdge<PasskeyLoginResult>('passkey-login', {
    challenge,
    assertionResponse,
  });
}

/**
 * Check if a wallet has a passkey bound
 */
export async function getPasskeyStatus(iotaWalletAddress: string): Promise<PasskeyStatusResult> {
  return callEdge<PasskeyStatusResult>('passkey-status', { iotaWalletAddress });
}
