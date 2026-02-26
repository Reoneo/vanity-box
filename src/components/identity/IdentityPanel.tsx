// Main Identity Panel - Compact DID → VC → VP → Verify flow

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Fingerprint, 
  ShieldCheck, 
  FileCheck, 
  CheckCircle2, 
  Loader2,
  Trash2,
  Wallet,
  ChevronRight,
  Check,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useIdentity, IdentityProvider } from '@/contexts/IdentityContext';
import { CredentialList } from './CredentialList';
import { VerificationResultCard } from './VerificationResultCard';
import { PresentationModal } from './PresentationModal';
import { LinkEthereumWalletModal } from '@/components/LinkEthereumWalletModal';
import { generateNonce, calculateExpiry } from '@/lib/identity/vault';
import { setLinkedDomain } from '@/lib/messaging/linkDomain';
import { cn } from '@/lib/utils';

interface IdentityPanelContentProps {
  iotaName: string;
}

type StepKey = 'did' | 'vc' | 'vp' | 'verify';

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
  const [expandedStep, setExpandedStep] = useState<StepKey | null>(null);

  const isStepComplete = (step: StepKey): boolean => {
    switch (step) {
      case 'did': return !!holderDid;
      case 'vc': return vcList.length > 0;
      case 'vp': return !!lastVpJwt;
      case 'verify': return !!verificationResult?.valid;
    }
  };

  const isStepActive = (step: StepKey): boolean => {
    switch (step) {
      case 'did': return currentStep === 'did' && !holderDid;
      case 'vc': return currentStep === 'vc' && !!holderDid;
      case 'vp': return currentStep === 'vp' && vcList.length > 0;
      case 'verify': return currentStep === 'verify' && !!lastVpJwt;
    }
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
        <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
        <span className="ml-2 text-sm text-muted-foreground">Loading identity...</span>
      </div>
    );
  }

  const steps: { key: StepKey; label: string; num: number }[] = [
    { key: 'did', label: 'Create DID', num: 1 },
    { key: 'vc', label: 'Request Credential', num: 2 },
    { key: 'vp', label: 'Create Presentation', num: 3 },
    { key: 'verify', label: 'Verify', num: 4 },
  ];

  return (
    <div className="space-y-4">
      {/* Compact status bar */}
      {verificationResult?.valid && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Identity Verified</span>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex items-center gap-1 justify-center py-1">
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer',
                isStepComplete(step.key)
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50'
                  : isStepActive(step.key)
                  ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 ring-2 ring-[#D4AF37]/20'
                  : 'bg-muted/30 text-muted-foreground border border-muted/50'
              )}
              onClick={() => setExpandedStep(expandedStep === step.key ? null : step.key)}
            >
              {isStepComplete(step.key) ? <Check className="w-3.5 h-3.5" /> : step.num}
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'h-px w-6 transition-colors',
                isStepComplete(step.key) ? 'bg-emerald-500/50' : 'bg-muted/30'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: DID */}
      <StepRow
        label="Create Holder DID"
        complete={isStepComplete('did')}
        active={isStepActive('did')}
        expanded={expandedStep === 'did'}
        onToggle={() => setExpandedStep(expandedStep === 'did' ? null : 'did')}
      >
        {!holderDid ? (
          <Button
            onClick={createDid}
            disabled={isLoading}
            size="sm"
            className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
          >
            {isLoading && currentStep === 'did' ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating...</>
            ) : (
              <>Generate DID <ChevronRight className="w-3.5 h-3.5 ml-1" /></>
            )}
          </Button>
        ) : (
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground mb-0.5">Your DID</p>
            <code className="text-[11px] break-all text-[#D4AF37] leading-relaxed">{holderDid}</code>
          </div>
        )}
      </StepRow>

      {/* Step 2: VC */}
      <StepRow
        label="Request Credential"
        complete={isStepComplete('vc')}
        active={isStepActive('vc')}
        expanded={expandedStep === 'vc'}
        onToggle={() => setExpandedStep(expandedStep === 'vc' ? null : 'vc')}
      >
        {holderDid && !vcList.some(vc => vc.claims.name === iotaName) && (
          <Button
            onClick={() => requestOwnershipCredential(iotaName)}
            disabled={isLoading || !holderDid}
            size="sm"
            className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
          >
            {isLoading && currentStep === 'vc' ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Requesting...</>
            ) : (
              <>Request for {iotaName} <ChevronRight className="w-3.5 h-3.5 ml-1" /></>
            )}
          </Button>
        )}
        {vcList.length > 0 && (
          <CredentialList
            credentials={vcList}
            onPresentCredential={handleCreatePresentation}
            isLoading={isLoading}
          />
        )}
      </StepRow>

      {/* Step 3: VP */}
      <StepRow
        label="Create Presentation"
        complete={isStepComplete('vp')}
        active={isStepActive('vp')}
        expanded={expandedStep === 'vp'}
        onToggle={() => setExpandedStep(expandedStep === 'vp' ? null : 'vp')}
      >
        {vcList.length > 0 && !lastVpJwt && (
          <p className="text-xs text-muted-foreground">
            Click "Present" on a credential above to create a VP
          </p>
        )}
        {lastVpJwt && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPresentationModal(true)}
            className="w-full border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            <FileCheck className="w-3.5 h-3.5 mr-1.5" />
            View Presentation
          </Button>
        )}
      </StepRow>

      {/* Step 4: Verify */}
      <StepRow
        label="Verify Presentation"
        complete={isStepComplete('verify')}
        active={isStepActive('verify')}
        expanded={expandedStep === 'verify'}
        onToggle={() => setExpandedStep(expandedStep === 'verify' ? null : 'verify')}
      >
        {lastVpJwt && !verificationResult?.valid && (
          <Button
            onClick={handleVerify}
            disabled={isLoading || !lastVpJwt}
            size="sm"
            className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
          >
            {isLoading && currentStep === 'verify' ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...</>
            ) : (
              <>Verify Now <ChevronRight className="w-3.5 h-3.5 ml-1" /></>
            )}
          </Button>
        )}
        {verificationResult && (
          <VerificationResultCard result={verificationResult} />
        )}
      </StepRow>

      {/* Link Ethereum Wallet — compact */}
      {holderDid && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
          <div className="min-w-0">
            <p className="text-sm font-medium">Link Ethereum Wallet</p>
            <p className="text-[11px] text-muted-foreground">Bind an EVM address via VC</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLinkEthModal(true)}
            className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 flex-shrink-0"
          >
            <Wallet className="w-3.5 h-3.5 mr-1" />
            Link
          </Button>
        </div>
      )}

      {/* Linked EVM addresses */}
      {vcList.filter(vc => vc.type === 'EthereumWalletOwnershipCredential').map((vc, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span className="text-xs font-mono truncate flex-1">{vc.claims.address}</span>
          <Badge variant="outline" className="text-[10px]">ETH</Badge>
        </div>
      ))}

      {/* Clear vault — minimal */}
      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearIdentity}
          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear Vault
        </Button>
      </div>

      {/* Modals */}
      <PresentationModal
        open={showPresentationModal}
        onClose={() => setShowPresentationModal(false)}
        vpJwt={lastVpJwt}
        expiresAt={vpExpiresAt}
        nonce={currentNonce}
        onVerify={handleVerify}
      />
      <LinkEthereumWalletModal
        open={showLinkEthModal}
        onClose={() => setShowLinkEthModal(false)}
        iotaName={iotaName}
      />
    </div>
  );
}

// Compact collapsible step row
function StepRow({
  label,
  complete,
  active,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  complete: boolean;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const hasContent = React.Children.toArray(children).some(Boolean);

  return (
    <div className={cn(
      'rounded-lg border transition-all',
      complete ? 'border-emerald-500/30 bg-emerald-500/5' :
      active ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' :
      'border-border bg-muted/5 opacity-60'
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
            complete ? 'bg-emerald-500/20' : active ? 'bg-[#D4AF37]/20' : 'bg-muted/30'
          )}>
            {complete ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                active ? 'bg-[#D4AF37]' : 'bg-muted-foreground/50'
              )} />
            )}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {hasContent && (
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )} />
        )}
      </button>
      {expanded && hasContent && (
        <div className="px-3 pb-3 space-y-2">
          {children}
        </div>
      )}
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
        <Fingerprint className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Connect your IOTA wallet to access Identity</p>
      </div>
    );
  }

  return (
    <IdentityProvider walletAddress={walletAddress}>
      <IdentityPanelContent iotaName={iotaName} />
    </IdentityProvider>
  );
}
