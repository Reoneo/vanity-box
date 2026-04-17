// Main Identity Panel - Compact DID → VC → VP → Verify flow + Multi-chain wallet linking

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronDown,
  Plus,
  Unplug,
  AlertTriangle,
  Link2,
} from 'lucide-react';
import { useIdentity, IdentityProvider } from '@/contexts/IdentityContext';
import { CredentialList } from './CredentialList';
import { VerificationResultCard } from './VerificationResultCard';
import { PresentationModal } from './PresentationModal';
import { LinkEthereumWalletModal } from '@/components/LinkEthereumWalletModal';
import { PasskeyWalletModal } from '@/components/PasskeyWalletModal';
import { generateNonce, calculateExpiry } from '@/lib/identity/vault';
import { setLinkedDomain } from '@/lib/messaging/linkDomain';
import { callEdge } from '@/lib/supaInvoke';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePetraWallet } from '@/hooks/use-petra-wallet';
import type { VerifiableCredential } from '@/types/identity';
import ethLogoDark from '@/assets/eth-logo-dark.svg';
import tonIconBlue from '@/assets/ton-icon-blue.png';
import aptosLogo from '@/assets/aptos-logo.png';

import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';

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
    addExternalCredential,
    removeCredentialByType,
    setStep,
  } = useIdentity();

  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showLinkEthModal, setShowLinkEthModal] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [currentNonce, setCurrentNonce] = useState<string>('');
  const [vpExpiresAt, setVpExpiresAt] = useState<string>('');
  const [expandedStep, setExpandedStep] = useState<StepKey | null>(null);

  // Wallet link section expansion state
  const [expandedWallet, setExpandedWallet] = useState<'eth' | 'ton' | 'aptos' | null>(null);

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

  // Get linked wallets from vcList
  const ethVcs = vcList.filter(vc => vc.type === 'EthereumWalletOwnershipCredential');
  const tonVcs = vcList.filter(vc => vc.type === 'TonWalletOwnershipCredential');
  const aptosVcs = vcList.filter(vc => vc.type === 'AptosWalletOwnershipCredential');

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
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
                  ? 'bg-primary/20 text-primary border border-primary/50 ring-2 ring-primary/20'
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
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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
            <code className="text-[11px] break-all text-primary leading-relaxed">{holderDid}</code>
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
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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
            className="w-full border-primary/50 text-primary hover:bg-primary/10"
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
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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

      {/* ── Wallet Linking Sections ── */}
      {holderDid && (
        <>
          {/* Link Ethereum Wallet */}
          <WalletLinkSection
            label="Link Ethereum Wallet"
            subtitle="Bind an EVM address via VC"
            icon={<img src={ethLogoDark} alt="ETH" className="w-4 h-4 flex-shrink-0" />}
            expanded={expandedWallet === 'eth'}
            onToggle={() => setExpandedWallet(expandedWallet === 'eth' ? null : 'eth')}
            linkedVcs={ethVcs}
            badgeLabel="ETH"
          >
            <Button
              size="sm"
              onClick={() => setShowLinkEthModal(true)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Link Ethereum Wallet
            </Button>
          </WalletLinkSection>

          {/* Link TON Wallet */}
          <TonWalletLinkSection
            iotaName={iotaName}
            holderDid={holderDid}
            linkedVcs={tonVcs}
            expanded={expandedWallet === 'ton'}
            onToggle={() => setExpandedWallet(expandedWallet === 'ton' ? null : 'ton')}
            addExternalCredential={addExternalCredential}
          />

          {/* Link Aptos Wallet */}
          <AptosWalletLinkSection
            iotaName={iotaName}
            holderDid={holderDid}
            linkedVcs={aptosVcs}
            expanded={expandedWallet === 'aptos'}
            onToggle={() => setExpandedWallet(expandedWallet === 'aptos' ? null : 'aptos')}
            addExternalCredential={addExternalCredential}
          />

          {/* Passkey Wallet */}
          <WalletLinkSection
            label="Passkey Wallet"
            subtitle="Passwordless sign-in via biometrics"
            icon={<Fingerprint className="w-4 h-4 flex-shrink-0 text-primary" />}
            expanded={false}
            onToggle={() => setShowPasskeyModal(true)}
            linkedVcs={[]}
            badgeLabel="Passkey"
          >
            <Button
              size="sm"
              onClick={() => setShowPasskeyModal(true)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
              Manage Passkeys
            </Button>
          </WalletLinkSection>
        </>
      )}

      {/* Clear vault — minimal */}
      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearIdentity}
          className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7"
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
      <PasskeyWalletModal
        open={showPasskeyModal}
        onClose={() => setShowPasskeyModal(false)}
        walletAddress={iotaName}
      />
    </div>
  );
}

// ── Reusable Expandable Wallet Link Section ──

function WalletLinkSection({
  label,
  subtitle,
  icon,
  expanded,
  onToggle,
  linkedVcs,
  badgeLabel,
  children,
}: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  linkedVcs: VerifiableCredential[];
  badgeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/5">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <div className="min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {linkedVcs.length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              {linkedVcs.length} linked
            </Badge>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Show linked addresses */}
          {linkedVcs.map((vc, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted/30 border border-border">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-xs font-mono truncate flex-1">{vc.claims.address}</span>
              <Badge variant="outline" className="text-[10px]">{badgeLabel}</Badge>
            </div>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}

// ── TON Wallet Link Section ──

function TonWalletLinkSection({
  iotaName,
  holderDid,
  linkedVcs,
  expanded,
  onToggle,
  addExternalCredential,
}: {
  iotaName: string;
  holderDid: string;
  linkedVcs: VerifiableCredential[];
  expanded: boolean;
  onToggle: () => void;
  addExternalCredential: (vc: VerifiableCredential) => Promise<void>;
}) {
  const [isLinking, setIsLinking] = useState(false);
  const [step, setStep] = useState<'idle' | 'connecting' | 'signing' | 'issuing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress() || '';

  const handleLinkTon = useCallback(async () => {
    if (!tonConnectUI) {
      toast.error('TON Connect not available');
      return;
    }

    setIsLinking(true);
    setStep('connecting');
    setErrorMsg('');

    try {
      // Connect if not already
      if (!tonConnectUI.wallet) {
        // openModal() shows the TON Connect UI; we wait for a wallet to connect
        await tonConnectUI.openModal();
        
        // Wait for wallet connection (poll with timeout)
        const connected = await new Promise<boolean>((resolve) => {
          // Check immediately in case already connected
          if (tonConnectUI.wallet) { resolve(true); return; }
          
          const unsub = tonConnectUI.onStatusChange((wallet) => {
            if (wallet) { unsub(); resolve(true); }
          });
          
          // Timeout after 120s
          setTimeout(() => { unsub(); resolve(false); }, 120_000);
        });
        
        if (!connected || !tonConnectUI.wallet) {
          setStep('idle');
          setIsLinking(false);
          return;
        }
      }

      const wallet = tonConnectUI.wallet;
      if (!wallet) {
        throw new Error('No TON wallet connected');
      }

      const address = wallet.account.address;
      setStep('signing');

      // Create proof message
      const timestamp = new Date().toISOString();
      const message = [
        `vanity.box wants you to verify your TON wallet:`,
        address,
        '',
        `Link TON wallet to IOTA identity ${iotaName}`,
        '',
        `DID: ${holderDid}`,
        `URI: https://vanity.box`,
        `Issued At: ${timestamp}`,
      ].join('\n');

      // For TON Connect, the connection itself proves ownership
      const tonProof = wallet.connectItems?.tonProof;
      const signature = (tonProof && 'proof' in tonProof ? (tonProof as any).proof?.signature : null) || 
                        `ton-connected-${Date.now()}-${address.slice(0, 10)}`;

      setStep('issuing');

      const response = await callEdge<{ vcJwt: string; issuerDid: string; issuedAt: string; vcType: string }>(
        'issue-wallet-vc',
        { holderDid, address, message, signature, iotaName, chain: 'ton' }
      );

      if (response?.vcJwt) {
        const newVc: VerifiableCredential = {
          vcJwt: response.vcJwt,
          issuerDid: response.issuerDid,
          type: 'TonWalletOwnershipCredential',
          issuedAt: response.issuedAt || new Date().toISOString(),
          claims: {
            name: iotaName,
            chain: 'TON',
            address: address,
          },
        };

        await addExternalCredential(newVc);
        setStep('done');
        toast.success('TON wallet linked successfully');

        // Notify SearchInterface so TON NFTs load immediately
        window.dispatchEvent(new CustomEvent('iota-ton-linked', {
          detail: { iotaName: iotaName.toLowerCase(), tonAddress: tonAddress },
        }));

        // Disconnect TON wallet after linking
        try { await tonConnectUI.disconnect(); } catch {}
      } else {
        throw new Error('Invalid response from credential issuance');
      }
    } catch (error: any) {
      console.error('TON link error:', error);
      const msg = error?.message || 'Failed to link TON wallet';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setErrorMsg('Connection was rejected');
      } else {
        setErrorMsg(msg);
      }
      setStep('error');
    } finally {
      setIsLinking(false);
    }
  }, [tonConnectUI, holderDid, iotaName, addExternalCredential]);

  return (
    <WalletLinkSection
      label="Link TON Wallet"
      subtitle="Connect via Telegram wallet"
      icon={<img src={tonIconBlue} alt="TON" className="w-4 h-4 flex-shrink-0 rounded-full" />}
      expanded={expanded}
      onToggle={onToggle}
      linkedVcs={linkedVcs}
      badgeLabel="TON"
    >
      {step === 'done' ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">TON wallet linked & disconnected</p>
        </div>
      ) : step === 'error' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{errorMsg}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setStep('idle')} className="w-full">
            Try Again
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={handleLinkTon}
          disabled={isLinking}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          {isLinking ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {step === 'connecting' ? 'Connecting…' : step === 'signing' ? 'Signing…' : 'Issuing…'}</>
          ) : (
            <><Link2 className="w-3.5 h-3.5 mr-1.5" /> Link TON Wallet</>
          )}
        </Button>
      )}
    </WalletLinkSection>
  );
}

// ── Aptos Wallet Link Section ──

function AptosWalletLinkSection({
  iotaName,
  holderDid,
  linkedVcs,
  expanded,
  onToggle,
  addExternalCredential,
}: {
  iotaName: string;
  holderDid: string;
  linkedVcs: VerifiableCredential[];
  expanded: boolean;
  onToggle: () => void;
  addExternalCredential: (vc: VerifiableCredential) => Promise<void>;
}) {
  const [isLinking, setIsLinking] = useState(false);
  const [step, setStep] = useState<'idle' | 'connecting' | 'signing' | 'issuing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const petra = usePetraWallet();

  // Live ref so async polling always sees latest adapter state
  const accountRef = useRef(petra.account);
  useEffect(() => { accountRef.current = petra.account; }, [petra.account]);

  const connectedRef = useRef(petra.isConnected);
  useEffect(() => { connectedRef.current = petra.isConnected; }, [petra.isConnected]);

  const normalizeAptosAddress = (value?: string | null): string => {
    if (!value) return '';
    const hex = value.toLowerCase().replace(/^0x/, '').replace(/^0+/, '');
    return `0x${hex.padStart(64, '0')}`;
  };

  /**
   * Connect to a chosen Aptos wallet via the Wallet Adapter (AIP-62).
   * Falls back to window.aptos / mobile deeplink if Petra is selected and adapter is unavailable.
   */
  const connectAndGetAccount = useCallback(async (walletName: string): Promise<{
    address: string;
    signMessage: (payload: any) => Promise<any>;
    disconnect: () => Promise<void>;
  }> => {
    const target = petra.wallets.find((w) => w.name === walletName);
    const isPetra = walletName.toLowerCase().includes('petra');

    // Path 1: Adapter connect (preferred for all AIP-62 wallets)
    if (target?.isInstalled) {
      console.log(`[Aptos] Connecting via adapter: ${walletName}`);
      if (!connectedRef.current) {
        await petra.connect(walletName);
      }

      const address = await new Promise<string>((resolve, reject) => {
        if (accountRef.current?.address) {
          resolve(accountRef.current.address);
          return;
        }
        let elapsed = 0;
        const iv = setInterval(() => {
          elapsed += 200;
          if (accountRef.current?.address) {
            clearInterval(iv);
            resolve(accountRef.current.address);
          } else if (elapsed >= 10000) {
            clearInterval(iv);
            reject(new Error('Adapter did not return an account'));
          }
        }, 200);
      });

      return {
        address,
        signMessage: (payload: any) => petra.signMessage(payload),
        disconnect: () => petra.disconnect(),
      };
    }

    // Path 2: Petra-specific fallbacks (window.aptos in in-app browser, mobile deeplink)
    if (isPetra) {
      const petraGlobal = (window as any).aptos ?? (window as any).petra;
      if (petraGlobal) {
        console.log('[Aptos] Using window.aptos / window.petra (injected)');
        try {
          const response = await petraGlobal.connect();
          const addr = response?.address;
          if (addr) {
            return {
              address: addr,
              signMessage: (payload: any) => petraGlobal.signMessage(payload),
              disconnect: () => petraGlobal.disconnect(),
            };
          }
        } catch (e: any) {
          console.warn('[Aptos] window.aptos.connect() failed:', e);
        }
      }

      const isMobile = /iPhone|iPad|iPod|Android|webOS/i.test(navigator.userAgent);
      if (isMobile) {
        const currentUrl = window.location.href;
        const deeplink = `https://petra.app/explore?link=${encodeURIComponent(currentUrl)}`;
        window.open(deeplink, '_blank');
        throw new Error('Opening Petra app… Once it opens, tap "Link Aptos Wallet" again inside Petra\'s browser.');
      }
    }

    // Not installed → send the user to the wallet's install page
    if (target?.url) {
      window.open(target.url, '_blank', 'noopener,noreferrer');
      throw new Error(`${walletName} is not installed. We opened the install page in a new tab.`);
    }

    throw new Error(`${walletName} not detected. Please install it and try again.`);
  }, [petra.wallets, petra.connect, petra.signMessage, petra.disconnect]);

  const handleLinkAptos = useCallback(async () => {
    setIsLinking(true);
    setStep('connecting');
    setErrorMsg('');

    try {
      const wallet = await connectAndGetAccount();
      const address = normalizeAptosAddress(wallet.address);

      setStep('signing');

      const timestamp = new Date().toISOString();
      const message = [
        'vanity.box wants you to verify your Aptos wallet:',
        address,
        '',
        `Link Aptos wallet to IOTA identity ${iotaName}`,
        '',
        `DID: ${holderDid}`,
        'URI: https://vanity.box',
        `Issued At: ${timestamp}`,
      ].join('\n');

      const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const signResult = await wallet.signMessage({
        address: true,
        application: true,
        chainId: true,
        message,
        nonce,
      });

      // Extract signature from response (shape varies between direct API and adapter)
      const signature = signResult?.signature
        ?? (signResult as any)?.result?.signature
        ?? (typeof signResult === 'string' ? signResult : null);

      if (!signature) {
        throw new Error('Petra returned an empty signature');
      }

      // Verify address match if returned
      const signedAddr = signResult?.address ?? (signResult as any)?.result?.address;
      if (signedAddr && normalizeAptosAddress(signedAddr) !== address) {
        throw new Error('Signed address does not match connected wallet address');
      }

      setStep('issuing');

      const response = await callEdge<{ vcJwt: string; issuerDid: string; issuedAt: string; vcType: string }>(
        'issue-wallet-vc',
        {
          holderDid,
          address,
          message,
          signature,
          iotaName,
          chain: 'aptos',
        }
      );

      if (response?.vcJwt) {
        const newVc: VerifiableCredential = {
          vcJwt: response.vcJwt,
          issuerDid: response.issuerDid,
          type: 'AptosWalletOwnershipCredential',
          issuedAt: response.issuedAt || new Date().toISOString(),
          claims: {
            name: iotaName,
            chain: 'Aptos',
            address,
          },
        };

        await addExternalCredential(newVc);
        setStep('done');
        toast.success('Aptos wallet linked successfully');

        try {
          await wallet.disconnect();
        } catch {
          // Best-effort disconnect
        }
      } else {
        throw new Error('Invalid response from credential issuance');
      }
    } catch (error: any) {
      console.error('Aptos link error:', error);
      const code = String(error?.code ?? '');
      const msg = error?.message || 'Failed to link Aptos wallet';

      if (code === '4001' || msg.includes('rejected') || msg.includes('denied')) {
        setErrorMsg('Connection/signature request was rejected');
      } else if (code === '4100') {
        setErrorMsg('Wallet is not authorized for this site. Please reconnect Petra.');
      } else if (code === '4000') {
        setErrorMsg('No Aptos account found in Petra wallet.');
      } else {
        setErrorMsg(msg);
      }

      setStep('error');
    } finally {
      setIsLinking(false);
    }
  }, [connectAndGetAccount, holderDid, iotaName, addExternalCredential]);

  return (
    <WalletLinkSection
      label="Link Aptos Wallet"
      subtitle="Connect via Petra wallet"
      icon={<img src={aptosLogo} alt="APT" className="w-4 h-4 flex-shrink-0 rounded-sm" />}
      expanded={expanded}
      onToggle={onToggle}
      linkedVcs={linkedVcs}
      badgeLabel="APT"
    >
      {step === 'done' ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Aptos wallet linked & disconnected</p>
        </div>
      ) : step === 'error' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{errorMsg}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setStep('idle')} className="w-full">
            Try Again
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={handleLinkAptos}
          disabled={isLinking}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          {isLinking ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {step === 'connecting' ? 'Connecting…' : step === 'signing' ? 'Signing…' : 'Issuing…'}</>
          ) : (
            <><Link2 className="w-3.5 h-3.5 mr-1.5" /> Link Aptos Wallet</>
          )}
        </Button>
      )}
    </WalletLinkSection>
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
      active ? 'border-primary/50 bg-primary/5' :
      'border-border bg-muted/5 opacity-60'
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
            complete ? 'bg-emerald-500/20' : active ? 'bg-primary/20' : 'bg-muted/30'
          )}>
            {complete ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                active ? 'bg-primary' : 'bg-muted-foreground/50'
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
