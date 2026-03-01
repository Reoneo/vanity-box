// WebAuthn browser API helpers for passkey wallet system

export function b64urlEncode(buf: Uint8Array): string {
  const bin = Array.from(buf)
    .map((b) => String.fromCharCode(b))
    .join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  return new Uint8Array(hash);
}

export function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined'
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Create a new passkey credential (registration ceremony).
 * Returns the raw PublicKeyCredential for server-side verification.
 */
export async function createPasskeyCredential(
  options: PublicKeyCredentialCreationOptions
): Promise<PublicKeyCredential> {
  const credential = await navigator.credentials.create({
    publicKey: options,
  });

  if (!credential) {
    throw new Error('Passkey creation was cancelled or failed');
  }

  return credential as PublicKeyCredential;
}

/**
 * Get a passkey assertion (authentication ceremony).
 * Returns the raw PublicKeyCredential for server-side verification.
 */
export async function getPasskeyAssertion(
  options: PublicKeyCredentialRequestOptions
): Promise<PublicKeyCredential> {
  const credential = await navigator.credentials.get({
    publicKey: options,
  });

  if (!credential) {
    throw new Error('Passkey authentication was cancelled or failed');
  }

  return credential as PublicKeyCredential;
}

/**
 * Serialize a PublicKeyCredential (registration) to JSON-safe format for sending to server.
 */
export function serializeRegistrationCredential(credential: PublicKeyCredential): {
  id: string;
  rawId: string;
  type: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
    publicKey: string | null;
    transports: string[];
  };
} {
  const response = credential.response as AuthenticatorAttestationResponse;

  let publicKeyB64u: string | null = null;
  if (typeof response.getPublicKey === 'function') {
    const pk = response.getPublicKey();
    if (pk) {
      publicKeyB64u = b64urlEncode(new Uint8Array(pk));
    }
  }

  let transports: string[] = [];
  if (typeof response.getTransports === 'function') {
    transports = response.getTransports();
  }

  return {
    id: credential.id,
    rawId: b64urlEncode(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      attestationObject: b64urlEncode(new Uint8Array(response.attestationObject)),
      clientDataJSON: b64urlEncode(new Uint8Array(response.clientDataJSON)),
      publicKey: publicKeyB64u,
      transports,
    },
  };
}

/**
 * Serialize a PublicKeyCredential (authentication) to JSON-safe format.
 */
export function serializeAssertionCredential(credential: PublicKeyCredential): {
  id: string;
  rawId: string;
  type: string;
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle: string | null;
  };
} {
  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: b64urlEncode(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      authenticatorData: b64urlEncode(new Uint8Array(response.authenticatorData)),
      clientDataJSON: b64urlEncode(new Uint8Array(response.clientDataJSON)),
      signature: b64urlEncode(new Uint8Array(response.signature)),
      userHandle: response.userHandle
        ? b64urlEncode(new Uint8Array(response.userHandle))
        : null,
    },
  };
}
