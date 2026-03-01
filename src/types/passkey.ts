// Passkey wallet system types

export type PasskeyBindingLevel = 'passkey_wallet' | 'existing_wallet_link';
export type PasskeyBindingStatus = 'active' | 'revoked';

export interface PasskeyBinding {
  id: string;
  userId: string;
  iotaWalletAddress: string;
  credentialId: string; // base64url
  publicKey: string; // base64url of 33-byte compressed P-256
  signCount: number;
  bindingLevel: PasskeyBindingLevel;
  origin: string;
  rpId: string;
  status: PasskeyBindingStatus;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface PasskeyWalletState {
  // Whether WebAuthn is available on this device
  isAvailable: boolean;
  // Whether platform authenticator exists
  hasPlatformAuth: boolean;
  // Active passkey bindings for current user
  bindings: PasskeyBinding[];
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isBinding: boolean;
  isAuthenticating: boolean;
  // Error
  error: string | null;
  // Current step in multi-step flows
  currentStep: PasskeyFlowStep;
}

export type PasskeyFlowStep =
  | 'idle'
  | 'wallet_proof' // Signing wallet proof message
  | 'passkey_create' // Creating passkey
  | 'verifying' // Server verification
  | 'complete'
  | 'error';

// API types

export interface BindChallengeResponse {
  bindSessionId: string;
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface RegisterChallengeResponse {
  bindSessionId: string;
  publicKeyOptions: PublicKeyCredentialCreationOptionsJSON;
}

export interface LoginChallengeResponse {
  challengeSessionId: string;
  publicKeyOptions: PublicKeyCredentialRequestOptionsJSON;
}

export interface LoginVerifyResponse {
  ok: boolean;
  binding: PasskeyBinding;
}

// JSON-serializable versions of WebAuthn options (as returned by server)
export interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string; // base64url
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
  authenticatorSelection: {
    residentKey: string;
    requireResidentKey: boolean;
    userVerification: string;
  };
  attestation: string;
  timeout: number;
  excludeCredentials?: Array<{
    id: string; // base64url
    type: 'public-key';
    transports?: string[];
  }>;
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string; // base64url
  rpId: string;
  allowCredentials?: Array<{
    id: string; // base64url
    type: 'public-key';
    transports?: string[];
  }>;
  userVerification: string;
  timeout: number;
}
