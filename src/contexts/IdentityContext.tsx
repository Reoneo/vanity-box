// IOTA Identity Context - Manages DID, VC, VP, and Verification state

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { 
  IdentityState, 
  IdentityActions, 
  IdentityStep,
  VerifiableCredential, 
  VerificationResult,
  CreateDidResponse,
  IssueVcResponse,
  CreateVpResponse,
  VerifyVpResponse
} from '@/types/identity';
import { callEdge } from '@/lib/supaInvoke';
import { 
  saveVaultToStorage, 
  loadVaultFromStorage, 
  exportVaultAsString,
  importVaultFromString,
  clearVaultStorage,
  generateNonce 
} from '@/lib/identity/vault';
import { toast } from 'sonner';

interface IdentityContextValue extends IdentityState, IdentityActions {
  isInitialized: boolean;
}

const defaultState: IdentityState = {
  holderDid: null,
  vcList: [],
  lastVpJwt: null,
  verificationResult: null,
  issuerDid: null,
  isLoading: false,
  error: null,
  currentStep: 'did',
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function useIdentity() {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
}

interface IdentityProviderProps {
  children: ReactNode;
  walletAddress: string;
  walletSignature?: string;
}

export function IdentityProvider({ children, walletAddress, walletSignature }: IdentityProviderProps) {
  const [state, setState] = useState<IdentityState>(defaultState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to get a signature for vault encryption
  const getVaultKey = useCallback(() => {
    return walletSignature || `vault-key-${walletAddress}`;
  }, [walletAddress, walletSignature]);

  // Restore identity from local vault on mount
  useEffect(() => {
    const restoreVault = async () => {
      try {
        const vault = await loadVaultFromStorage(getVaultKey());
        if (vault && vault.holderDid) {
          // Determine the appropriate step based on restored data
          let restoredStep: IdentityStep = 'vc';
          if (vault.lastVerification?.valid) {
            restoredStep = 'complete';
          } else if (vault.vcList.length > 0) {
            restoredStep = 'vp';
          }

          setState(prev => ({
            ...prev,
            holderDid: vault.holderDid,
            vcList: vault.vcList || [],
            issuerDid: vault.issuerDid,
            verificationResult: vault.lastVerification,
            currentStep: restoredStep,
          }));
          console.log('✅ Identity restored from vault:', vault.holderDid);
        }
      } catch (error) {
        console.warn('Could not restore vault:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    restoreVault();
  }, [getVaultKey]);

  // Create a new Holder DID (or return existing)
  const createDid = useCallback(async (): Promise<string | null> => {
    // If we already have a DID, return it instead of creating a new one
    if (state.holderDid) {
      toast.info('DID already exists');
      setState(prev => ({ ...prev, currentStep: 'vc' }));
      return state.holderDid;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await callEdge<CreateDidResponse>('identity-holder-create-did', {
        walletAddress,
      });

      if (response?.holderDid) {
        setState(prev => ({
          ...prev,
          holderDid: response.holderDid,
          isLoading: false,
          currentStep: 'vc',
        }));

        // Save to vault immediately
        await saveVaultToStorage(
          response.holderDid,
          state.vcList,
          state.issuerDid,
          state.verificationResult,
          getVaultKey()
        );

        toast.success('DID created and anchored');
        return response.holderDid;
      } else {
        throw new Error('Invalid response from DID creation');
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to create DID';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      toast.error(message);
      return null;
    }
  }, [walletAddress, state.holderDid, state.vcList, state.issuerDid, state.verificationResult, getVaultKey]);

  // Request a Verifiable Credential from the Issuer
  const requestOwnershipCredential = useCallback(async (name: string): Promise<VerifiableCredential | null> => {
    if (!state.holderDid) {
      toast.error('Please create a DID first');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await callEdge<IssueVcResponse>('identity-issuer-issue-vc', {
        holderDid: state.holderDid,
        name,
        walletAddress,
      });

      if (response?.vcJwt && response?.issuerDid) {
        const newVc: VerifiableCredential = {
          vcJwt: response.vcJwt,
          issuerDid: response.issuerDid,
          type: 'VanityNameOwnershipCredential',
          issuedAt: new Date().toISOString(),
          claims: {
            name,
            chain: 'IOTA',
          },
        };

        const updatedVcList = [...state.vcList, newVc];

        setState(prev => ({
          ...prev,
          vcList: updatedVcList,
          issuerDid: response.issuerDid,
          isLoading: false,
          currentStep: 'vp',
        }));

        // Save to vault
        await saveVaultToStorage(
          state.holderDid,
          updatedVcList,
          response.issuerDid,
          state.verificationResult,
          getVaultKey()
        );

        toast.success('Credential issued successfully');
        return newVc;
      } else {
        throw new Error('Invalid response from credential issuance');
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to request credential';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      toast.error(message);
      return null;
    }
  }, [state.holderDid, state.vcList, state.verificationResult, walletAddress, getVaultKey]);

  // Create a Verifiable Presentation from a VC
  const createPresentationFromCredential = useCallback(async (
    vcJwt: string, 
    customNonce?: string
  ): Promise<string | null> => {
    if (!state.holderDid) {
      toast.error('Please create a DID first');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const nonce = customNonce || generateNonce();
    const expiresInSeconds = 600; // 10 minutes

    try {
      const response = await callEdge<CreateVpResponse>('identity-holder-create-vp', {
        holderDid: state.holderDid,
        vcJwt,
        nonce,
        expiresInSeconds,
      });

      if (response?.vpJwt) {
        setState(prev => ({
          ...prev,
          lastVpJwt: response.vpJwt,
          isLoading: false,
          currentStep: 'verify',
        }));

        toast.success('Presentation created successfully');
        return response.vpJwt;
      } else {
        throw new Error('Invalid response from presentation creation');
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to create presentation';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      toast.error(message);
      return null;
    }
  }, [state.holderDid]);

  // Verify a Verifiable Presentation
  const verifyPresentation = useCallback(async (vpJwt: string): Promise<VerificationResult | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await callEdge<VerifyVpResponse>('identity-verifier-validate', {
        vpJwt,
      });

      const result: VerificationResult = {
        valid: response?.valid || false,
        output: response?.output || 'Verification failed',
        subjectDid: response?.subjectDid,
        claims: response?.claims,
        verifiedAt: new Date().toISOString(),
      };

      setState(prev => ({
        ...prev,
        verificationResult: result,
        isLoading: false,
        currentStep: result.valid ? 'complete' : 'verify',
      }));

      // Save to vault
      await saveVaultToStorage(
        state.holderDid,
        state.vcList,
        state.issuerDid,
        result,
        getVaultKey()
      );

      if (result.valid) {
        toast.success('Verification successful!');
      } else {
        toast.error('Verification failed');
      }

      return result;
    } catch (error: any) {
      const message = error?.message || 'Failed to verify presentation';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      toast.error(message);
      return null;
    }
  }, [state.holderDid, state.vcList, state.issuerDid, getVaultKey]);

  // Export vault
  const exportVault = useCallback(async (): Promise<string | null> => {
    try {
      const exported = await exportVaultAsString(getVaultKey());
      if (exported) {
        toast.success('Vault exported');
      }
      return exported;
    } catch (error: any) {
      toast.error('Failed to export vault');
      return null;
    }
  }, [getVaultKey]);

  // Import vault
  const importVault = useCallback(async (
    encryptedData: string, 
    signature: string
  ): Promise<boolean> => {
    try {
      const vault = await importVaultFromString(encryptedData, signature);
      if (vault) {
        setState(prev => ({
          ...prev,
          holderDid: vault.holderDid,
          vcList: vault.vcList,
          issuerDid: vault.issuerDid,
          verificationResult: vault.lastVerification,
          currentStep: vault.holderDid ? (vault.vcList.length > 0 ? 'vp' : 'vc') : 'did',
        }));
        toast.success('Vault imported successfully');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error('Failed to import vault');
      return false;
    }
  }, []);

  // Clear identity
  const clearIdentity = useCallback(() => {
    clearVaultStorage();
    setState(defaultState);
    toast.success('Identity cleared');
  }, []);

  // Set current step
  const setStep = useCallback((step: IdentityStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  // Add an externally-issued VC (e.g. EthereumWalletOwnershipCredential)
  const addExternalCredential = useCallback(async (newVc: VerifiableCredential): Promise<void> => {
    // Deduplicate by type + address
    const isDuplicate = state.vcList.some(
      vc => vc.type === newVc.type && vc.claims?.address?.toLowerCase() === newVc.claims?.address?.toLowerCase()
    );
    const updatedVcList = isDuplicate
      ? state.vcList.map(vc =>
          vc.type === newVc.type && vc.claims?.address?.toLowerCase() === newVc.claims?.address?.toLowerCase()
            ? newVc : vc
        )
      : [...state.vcList, newVc];

    setState(prev => ({ ...prev, vcList: updatedVcList }));

    // Persist to vault
    await saveVaultToStorage(
      state.holderDid,
      updatedVcList,
      state.issuerDid,
      state.verificationResult,
      getVaultKey()
    );
  }, [state.holderDid, state.vcList, state.issuerDid, state.verificationResult, getVaultKey]);

  const contextValue: IdentityContextValue = {
    ...state,
    isInitialized,
    createDid,
    requestOwnershipCredential,
    createPresentationFromCredential,
    verifyPresentation,
    addExternalCredential,
    exportVault,
    importVault,
    clearIdentity,
    setStep,
  };

  return (
    <IdentityContext.Provider value={contextValue}>
      {children}
    </IdentityContext.Provider>
  );
}
