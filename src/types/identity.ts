// IOTA Identity Types - DID, VC, VP, Verification

export interface HolderDid {
  did: string;
  createdAt: string;
}

export interface VerifiableCredential {
  vcJwt: string;
  issuerDid: string;
  type: string;
  issuedAt: string;
  expiresAt?: string;
  claims: VanityNameClaims;
}

export interface VanityNameClaims {
  name: string;
  chain: 'IOTA' | 'Ethereum' | 'TON' | 'Aptos' | 'Sui' | 'Vechain';
  issuedBy?: string;
  address?: string;
}

export interface VerifiablePresentation {
  vpJwt: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
}

export interface VerificationResult {
  valid: boolean;
  output: string;
  subjectDid?: string;
  claims?: VanityNameClaims;
  verifiedAt?: string;
}

export interface IdentityVault {
  holderDid: string | null;
  vcList: VerifiableCredential[];
  issuerDid: string | null;
  lastVerification: VerificationResult | null;
  encryptedAt: string;
}

export interface IdentityState {
  holderDid: string | null;
  vcList: VerifiableCredential[];
  lastVpJwt: string | null;
  verificationResult: VerificationResult | null;
  issuerDid: string | null;
  isLoading: boolean;
  error: string | null;
  currentStep: IdentityStep;
}

export type IdentityStep = 'did' | 'vc' | 'vp' | 'verify' | 'complete';

export interface IdentityActions {
  createDid: () => Promise<string | null>;
  requestOwnershipCredential: (name: string) => Promise<VerifiableCredential | null>;
  createPresentationFromCredential: (vcJwt: string, nonce?: string) => Promise<string | null>;
  verifyPresentation: (vpJwt: string) => Promise<VerificationResult | null>;
  addExternalCredential: (vc: VerifiableCredential) => Promise<void>;
  exportVault: () => Promise<string | null>;
  importVault: (encryptedData: string, walletSignature: string) => Promise<boolean>;
  removeCredentialByType: (type: string) => Promise<void>;
  clearIdentity: () => void;
  setStep: (step: IdentityStep) => void;
}

// API Request/Response types
export interface CreateDidRequest {
  walletAddress: string;
}

export interface CreateDidResponse {
  holderDid: string;
}

export interface IssueVcRequest {
  holderDid: string;
  name: string;
  walletAddress: string;
}

export interface IssueVcResponse {
  vcJwt: string;
  issuerDid: string;
}

export interface CreateVpRequest {
  holderDid: string;
  vcJwt: string;
  nonce: string;
  expiresInSeconds: number;
}

export interface CreateVpResponse {
  vpJwt: string;
}

export interface VerifyVpRequest {
  vpJwt: string;
}

export interface VerifyVpResponse {
  valid: boolean;
  output: string;
  subjectDid?: string;
  claims?: VanityNameClaims;
}
