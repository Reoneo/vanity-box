// Main Identity Panel - Workshop-style DID → VC → VP → Verify flow

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Fingerprint, 
  ShieldCheck, 
  FileCheck, 
  CheckCircle2, 
  Loader2,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { useIdentity, IdentityProvider } from '@/contexts/IdentityContext';
import { StepCard, StepStatus } from './StepCard';
import { CredentialList } from './CredentialList';
import { VerificationResultCard } from './VerificationResultCard';
import { PresentationModal } from './PresentationModal';
import { LinkEthereumWalletModal } from '@/components/LinkEthereumWalletModal';
import { generateNonce, calculateExpiry } from '@/lib/identity/vault';
import { setLinkedDomain } from '@/lib/messaging/linkDomain';

interface IdentityPanelContentProps {
  iotaName: string;
}

function IdentityPanelContent({ iotaName }: IdentityPanelContentProps) {
  const {
    holderDid,
    vcList,
    lastVpJwt,
    verificationResult,
    isLoading,
    error,
    currentStep,
    isInitialized,
    createDid,
    requestOwnershipCredential,
    createPresentationFromCredential,
    verifyPresentation,
    clearIdentity,
    setStep,
  } = useIdentity();

  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showLinkEthModal, setShowLinkEthModal] = useState(false);
  const [currentNonce, setCurrentNonce] = useState<string>('');
  const [vpExpiresAt, setVpExpiresAt] = useState<string>('');

  const getStepStatus = (step: number): StepStatus => {
    if (step === 1) {
      if (holderDid) return 'completed';
      if (currentStep === 'did') return 'active';
      return 'pending';
    }
    if (step === 2) {
      if (vcList.length > 0) return 'completed';
      if (currentStep === 'vc' && holderDid) return 'active';
      return 'pending';
    }
    if (step === 3) {
      if (lastVpJwt) return 'completed';
      if (currentStep === 'vp' && vcList.length > 0) return 'active';
      return 'pending';
    }
    if (step === 4) {
      if (verificationResult?.valid) return 'completed';
      if (currentStep === 'verify' && lastVpJwt) return 'active';
      return 'pending';
    }
    return 'pending';
  };

  const handleCreatePresentation = async (vcJwt: string) => {
    const nonce = generateNonce();
    setCurrentNonce(nonce);
    setVpExpiresAt(calculateExpiry(600));
    
    const vpJwt = await createPresentationFromCredential(vcJwt, nonce);
    if (vpJwt) {
      setShowPresentationModal(true);
    }
  };

  const handleVerify = async () => {
    if (lastVpJwt) {
      await verifyPresentation(lastVpJwt);
    }
  };

  // Auto-link domain for messaging after successful VP verification
  useEffect(() => {
    if (verificationResult?.valid && iotaName) {
      setLinkedDomain(iotaName);
    }
  }, [verificationResult?.valid, iotaName]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
        <span className="ml-2 text-muted-foreground">Loading identity...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="font-semibold">IOTA Identity</h3>
            <p className="text-xs text-muted-foreground">DID + VC + VP + Verify</p>
          </div>
        </div>
        {verificationResult?.valid && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )}
      </div>

      <Separator />

      {/* Step Cards */}
      <div className="space-y-4">
        {/* Step 1: Create DID */}
        <StepCard
          title="Create Holder DID"
          description="Generate your decentralized identifier"
          status={getStepStatus(1)}
          stepNumber={1}
          isLoading={isLoading && currentStep === 'did'}
          actionLabel="Create DID"
          onAction={createDid}
          disabled={!!holderDid}
        >
          {holderDid && (
            <div className="p-3 rounded-lg bg-muted/30 mt-3">
              <p className="text-xs text-muted-foreground mb-1">Your DID</p>
              <code className="text-xs break-all text-[#D4AF37]">
                {holderDid}
              </code>
            </div>
          )}
        </StepCard>

        {/* Step 2: Request VC */}
        <StepCard
          title="Request Credential"
          description="Get a VanityNameOwnershipCredential from Vanity.box"
          status={getStepStatus(2)}
          stepNumber={2}
          isLoading={isLoading && currentStep === 'vc'}
          actionLabel={`Request for ${iotaName}`}
          onAction={() => requestOwnershipCredential(iotaName)}
          disabled={!holderDid || vcList.some(vc => vc.claims.name === iotaName)}
        >
          {vcList.length > 0 && (
            <div className="mt-3">
              <CredentialList
                credentials={vcList}
                onPresentCredential={handleCreatePresentation}
                isLoading={isLoading}
              />
            </div>
          )}
        </StepCard>

        {/* Step 3: Create VP */}
        <StepCard
          title="Create Presentation"
          description="Generate a verifiable presentation with challenge nonce"
          status={getStepStatus(3)}
          stepNumber={3}
          isLoading={isLoading && currentStep === 'vp'}
        >
          {vcList.length > 0 && currentStep === 'vp' && (
            <p className="text-sm text-muted-foreground mt-3">
              Click "Present" on a credential above to create a VP
            </p>
          )}
          {lastVpJwt && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPresentationModal(true)}
                className="w-full border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                View Presentation
              </Button>
            </div>
          )}
        </StepCard>

        {/* Step 4: Verify */}
        <StepCard
          title="Verify Presentation"
          description="Validate the VP signature and embedded credentials"
          status={getStepStatus(4)}
          stepNumber={4}
          isLoading={isLoading && currentStep === 'verify'}
          actionLabel="Verify Now"
          onAction={handleVerify}
          disabled={!lastVpJwt}
        >
          {verificationResult && (
            <div className="mt-3">
              <VerificationResultCard result={verificationResult} />
            </div>
          )}
        </StepCard>
      </div>

      {/* Link Ethereum Wallet */}
      {holderDid && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Link Ethereum Wallet</h4>
                <p className="text-xs text-muted-foreground">Bind an EVM address to your DID via VC</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLinkEthModal(true)}
                className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Wallet className="w-4 h-4 mr-1" />
                Link Wallet
              </Button>
            </div>
            {/* Show existing EVM credentials */}
            {vcList.filter(vc => vc.type === 'EthereumWalletOwnershipCredential').map((vc, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-xs font-mono truncate flex-1">{vc.claims.address}</span>
                <Badge variant="outline" className="text-xs">Ethereum</Badge>
              </div>
            ))}
          </div>
        </>
      )}

      <Separator />

      {/* Vault Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Vault Actions</p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearIdentity}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Presentation Modal */}
      <PresentationModal
        open={showPresentationModal}
        onClose={() => setShowPresentationModal(false)}
        vpJwt={lastVpJwt}
        expiresAt={vpExpiresAt}
        nonce={currentNonce}
        onVerify={handleVerify}
      />

      {/* Link Ethereum Wallet Modal */}
      <LinkEthereumWalletModal
        open={showLinkEthModal}
        onClose={() => setShowLinkEthModal(false)}
        iotaName={iotaName}
      />
    </div>
  );
}

interface IdentityPanelProps {
  iotaName: string;
  walletAddress: string;
}

export function IdentityPanel({ iotaName, walletAddress }: IdentityPanelProps) {
  if (!walletAddress || !iotaName) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Fingerprint className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Connect your IOTA wallet to access Identity features</p>
      </div>
    );
  }

  return (
    <IdentityProvider walletAddress={walletAddress}>
      <IdentityPanelContent iotaName={iotaName} />
    </IdentityProvider>
  );
}
