// Passkey Wallet Modal - Create / Sign In / Link Existing
// Redesigned with improved UX, auto-close, and profile loading

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useIotaWallet } from '@/contexts/IotaWalletContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Fingerprint,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Wallet,
  KeyRound,
  Trash2,
  ChevronRight,
  LogIn,
  Monitor,
  Smartphone,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { usePasskeyWallet, isValidIotaAddress } from '@/hooks/usePasskeyWallet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PasskeyBinding } from '@/types/passkey';

/* ─────────── Session storage key ─────────── */
const PASSKEY_IOTA_SESSION_KEY = 'vanity_passkey_iota_address';

/* ─────────── Wallet Standard types ─────────── */
interface WalletStandardWallet {
  name: string;
  icon?: string;
  accounts: Array<{ address: string }>;
  features: Record<string, unknown>;
  connect?: () => Promise<void>;
}

interface WalletStandardAPI {
  get: () => WalletStandardWallet[];
  on: (event: string, cb: () => void) => (() => void);
}

declare global {
  interface Window {
    iota?: {
      connect: () => Promise<boolean>;
      disconnect: () => Promise<void>;
      request: (params: { method: string; params?: any }) => Promise<any>;
      getAccounts?: () => Promise<string[]>;
    };
    nightly?: { iota?: Window['iota'] };
    __iotaWalletStandard?: WalletStandardAPI;
  }
}

/* ─────────── Environment detection ─────────── */
function isExtensionCapableBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isChromium = /Chrome|Chromium|CriOS/.test(ua) || /Edg/.test(ua) || /Brave/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|Firefox|OPR|Opera/.test(ua);
  const isIPadSafari = isSafari && (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1));
  const isMacSafari = isSafari && /Macintosh/.test(ua) && !isIPadSafari;
  const isMobilePhone = /Android|iPhone|iPod/.test(ua);
  if (isMobilePhone) return false;
  if (isChromium) return true;
  if (isMacSafari || isIPadSafari) return true;
  return false;
}

/* ─────────── Emit passkey wallet connection + load profile ─────────── */
// Now a thin wrapper — the real work is done by IotaWalletContext.setPasskeyConnected
// kept for backward compat with the modal's internal usage
function emitPasskeyWalletConnected(address: string, ctxSet: (addr: string) => void) {
  if (!isValidIotaAddress(address)) {
    console.warn('[PasskeyWallet] Refusing to emit invalid address:', address);
    return;
  }
  ctxSet(address); // sets context state, persists to sessionStorage, dispatches events + profile load
}

/* ─────────── Wallet detection hook ─────────── */
type WalletConnectStatus = 'idle' | 'detecting' | 'detected' | 'connecting' | 'connected' | 'error';

interface WalletDetectionState {
  envSupported: boolean;
  providerDetected: boolean;
  providerName: string | null;
  connectStatus: WalletConnectStatus;
  connectedAddress: string | null;
  error: string | null;
  connectWallet: () => Promise<void>;
  reset: () => void;
}

function useIotaWalletDetection(modalOpen: boolean): WalletDetectionState {
  const [envSupported, setEnvSupported] = useState(isExtensionCapableBrowser);
  const [providerDetected, setProviderDetected] = useState(false);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<WalletConnectStatus>('idle');
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<any>(null);

  useEffect(() => {
    if (modalOpen) setEnvSupported(isExtensionCapableBrowser());
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    setConnectStatus('detecting');
    setProviderDetected(false);
    setProviderName(null);
    setError(null);

    let cancelled = false;
    let attempts = 0;
    let unsubWS: (() => void) | null = null;

    const checkProviders = () => {
      try {
        const ws = (globalThis as any).__iotaWalletStandard as WalletStandardAPI | undefined;
        if (ws) {
          const wallets = ws.get();
          const iotaWallet = wallets.find(
            (w) => w.features?.['standard:connect'] && (
              w.name.toLowerCase().includes('iota') ||
              w.name.toLowerCase().includes('nightly')
            )
          );
          if (iotaWallet) {
            providerRef.current = iotaWallet;
            if (!cancelled) {
              setProviderDetected(true);
              setProviderName(iotaWallet.name);
              setConnectStatus('detected');
              setEnvSupported(true);
            }
            return true;
          }
          unsubWS = ws.on('register', () => {
            if (!cancelled) checkProviders();
          });
        }
      } catch { /* ignore */ }

      if (window.nightly?.iota) {
        providerRef.current = { type: 'nightly-injected', provider: window.nightly.iota };
        if (!cancelled) {
          setProviderDetected(true);
          setProviderName('Nightly');
          setConnectStatus('detected');
          setEnvSupported(true);
        }
        return true;
      }

      if (window.iota) {
        providerRef.current = { type: 'legacy-injected', provider: window.iota };
        if (!cancelled) {
          setProviderDetected(true);
          setProviderName('IOTA Wallet');
          setConnectStatus('detected');
          setEnvSupported(true);
        }
        return true;
      }

      return false;
    };

    if (checkProviders()) return;

    const interval = window.setInterval(() => {
      if (cancelled) return;
      if (checkProviders()) { clearInterval(interval); return; }
      attempts++;
      if (attempts > 40) { clearInterval(interval); if (!cancelled) setConnectStatus('idle'); }
    }, 300);

    return () => { cancelled = true; clearInterval(interval); unsubWS?.(); };
  }, [modalOpen]);

  const connectWallet = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider) { setError('No wallet provider detected'); return; }
    setConnectStatus('connecting');
    setError(null);

    try {
      if (provider.features?.['standard:connect']) {
        const connectFeature = provider.features['standard:connect'] as { connect: () => Promise<any> };
        const connectResult = await connectFeature.connect();
        const accounts = connectResult?.accounts || provider.accounts || [];
        if (accounts.length > 0) {
          setConnectedAddress(accounts[0]?.address || accounts[0]);
          setConnectStatus('connected');
          return;
        }
        throw new Error('No accounts returned after connect');
      }

      const injected = provider.provider || provider;
      if (injected?.connect) {
        const result = await injected.connect();
        let address: string | null = null;
        if (typeof result === 'object' && result !== null) {
          if (result.address) address = result.address;
          else if (Array.isArray(result.accounts)) address = result.accounts[0]?.address || result.accounts[0];
          else if (Array.isArray(result)) address = result[0]?.address || result[0];
        }
        if (!address && injected.getAccounts) {
          const accts = await injected.getAccounts();
          if (accts?.length) address = accts[0];
        }
        if (!address) {
          try {
            const reqResult = await injected.request({ method: 'standard:connect' });
            if (Array.isArray(reqResult)) address = reqResult[0];
            else if (reqResult?.accounts) address = reqResult.accounts[0]?.address || reqResult.accounts[0];
            else if (reqResult?.address) address = reqResult.address;
          } catch { /* connect was enough */ }
        }
        if (!address && injected.accounts?.length) {
          address = injected.accounts[0]?.address || injected.accounts[0];
        }
        if (address) { setConnectedAddress(address); setConnectStatus('connected'); return; }
        throw new Error('Failed to connect');
      }
      throw new Error('Provider does not support connect');
    } catch (err: any) {
      console.error('Wallet connect error:', err);
      setError(err.message || 'Failed to connect wallet');
      setConnectStatus('error');
    }
  }, []);

  const reset = useCallback(() => { setConnectedAddress(null); setConnectStatus('idle'); setError(null); }, []);

  return { envSupported, providerDetected, providerName, connectStatus, connectedAddress, error, connectWallet, reset };
}

/* ─────────── Props ─────────── */
interface PasskeyWalletModalProps {
  open: boolean;
  onClose: () => void;
  walletAddress?: string;
  onSignPersonalMessage?: (message: Uint8Array) => Promise<{ signature: string }>;
}

/* ─────────── Main Modal ─────────── */
export function PasskeyWalletModal({
  open,
  onClose,
  walletAddress,
  onSignPersonalMessage,
}: PasskeyWalletModalProps) {
  const {
    isAvailable,
    hasPlatformAuth,
    bindings,
    isCreating,
    isBinding,
    isAuthenticating,
    error: hookError,
    currentStep,
    createPasskeyWallet,
    bindExistingWallet,
    loginWithPasskey,
    unbindPasskey,
    loadBindings,
    resetError: resetHookError,
    createdWalletAddress,
  } = usePasskeyWallet(walletAddress || undefined);

  const { setPasskeyConnected } = useIotaWallet();
  const wallet = useIotaWalletDetection(open);

  const [activeTab, setActiveTab] = useState<'create' | 'signin' | 'link'>('create');
  const [confirmUnbind, setConfirmUnbind] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [showBindings, setShowBindings] = useState(false);

  // Clear errors when switching tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'create' | 'signin' | 'link');
    setTabError(null);
    resetHookError();
  };

  // Load bindings when modal opens
  useEffect(() => {
    if (open && walletAddress) loadBindings();
  }, [open, walletAddress, loadBindings]);

  // Emit + auto-close when createdWalletAddress is set after create
  useEffect(() => {
    if (createdWalletAddress && currentStep === 'complete') {
      emitPasskeyWalletConnected(createdWalletAddress, setPasskeyConnected);
      toast.success('Passkey wallet created!');
      // Close modal after brief success flash
      const timer = setTimeout(() => onClose(), 600);
      return () => clearTimeout(timer);
    }
  }, [createdWalletAddress, currentStep, onClose]);

  /* ── Create Wallet Handler ── */
  const handleCreateWallet = async () => {
    setTabError(null);
    const success = await createPasskeyWallet();
    if (!success) {
      // Read error directly from hook after the async completes on next tick
      setTimeout(() => {
        setTabError(hookError || 'Passkey creation failed. Please try again.');
      }, 50);
    }
    // Success is handled by the useEffect above
  };

  /* ── Sign In Handler ── */
  const handleSignIn = async () => {
    setTabError(null);
    const binding = await loginWithPasskey();
    if (binding) {
      const addr = (binding as any)?.iotaWalletAddress || (binding as any)?.walletAddress;
      if (addr && isValidIotaAddress(addr)) {
        emitPasskeyWalletConnected(addr, setPasskeyConnected);
        toast.success('Signed in with passkey');
        setTimeout(() => onClose(), 600);
      } else {
        setTabError('Sign-in succeeded but no valid wallet address was returned.');
      }
    } else {
      // Use a microtask to let React flush the error state from the hook
      setTimeout(() => {
        setTabError(hookError || 'Sign-in failed. Please try again.');
      }, 50);
    }
  };

  /* ── Link Existing Handler ── */
  const handleBindWallet = async () => {
    setTabError(null);
    if (!wallet.connectedAddress && !walletAddress) {
      setTabError('Connect your IOTA wallet extension first');
      return;
    }
    if (!onSignPersonalMessage) {
      setTabError('Wallet signing not available. Connect your extension wallet first.');
      return;
    }
    const success = await bindExistingWallet(onSignPersonalMessage);
    if (success) {
      toast.success('Wallet linked to passkey!');
      setTimeout(() => onClose(), 600);
    } else {
      setTimeout(() => {
        setTabError(hookError || 'Linking failed. Please try again.');
      }, 50);
    }
  };

  const handleUnbind = async (bindingId: string) => {
    const success = await unbindPasskey(bindingId);
    if (success) {
      toast.success('Passkey unbound');
      setConfirmUnbind(null);
    }
  };

  if (!isAvailable) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[420px] mx-auto max-h-[85vh] p-0 gap-0 rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Not Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                WebAuthn is not available on this device. Passkey wallets require a browser with biometric or PIN support.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isBusy = isCreating || isAuthenticating || isBinding;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isBusy) onClose(); }}>
      <DialogContent className="sm:max-w-[440px] mx-auto max-h-[85vh] p-0 gap-0 rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-primary" />
              </div>
              Passkey Wallet
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Secure IOTA wallet backed by your device biometric
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-4 overflow-y-auto max-h-[calc(85vh-100px)]">
          {/* Error banner */}
          {tabError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/8 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-destructive leading-relaxed">{tabError}</p>
              </div>
              <button
                onClick={() => { setTabError(null); resetHookError(); }}
                className="text-destructive/60 hover:text-destructive text-xs font-medium flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* Success state */}
          {currentStep === 'complete' && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Success! Connecting your wallet…
              </p>
            </div>
          )}

          {/* Action Cards */}
          <div className="space-y-2.5">
            {/* Create Card */}
            <ActionCard
              active={activeTab === 'create'}
              onClick={() => handleTabChange('create')}
              icon={<Plus className="w-4.5 h-4.5" />}
              title="Create New"
              subtitle="Generate a new IOTA wallet with passkey"
              disabled={isBusy}
            >
              {activeTab === 'create' && (
                <div className="pt-3 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your device's biometric (Face ID, fingerprint, PIN) becomes your private key. 
                    No seed phrase or extension needed.
                  </p>
                  {!hasPlatformAuth && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      No platform authenticator detected — you may need a security key.
                    </p>
                  )}
                  <Button
                    onClick={handleCreateWallet}
                    disabled={isCreating}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                  >
                    {isCreating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {currentStep === 'passkey_create' ? 'Authenticate…' : currentStep === 'verifying' ? 'Verifying…' : 'Processing…'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4" />
                        Create Passkey Wallet
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </ActionCard>

            {/* Sign In Card */}
            <ActionCard
              active={activeTab === 'signin'}
              onClick={() => handleTabChange('signin')}
              icon={<LogIn className="w-4.5 h-4.5" />}
              title="Sign In"
              subtitle="Use an existing passkey to connect"
              disabled={isBusy}
            >
              {activeTab === 'signin' && (
                <div className="pt-3 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Authenticate with a previously created passkey. Use your biometric or PIN to reconnect instantly.
                  </p>
                  <Button
                    onClick={handleSignIn}
                    disabled={isAuthenticating}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                  >
                    {isAuthenticating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authenticating…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Sign In with Passkey
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </ActionCard>

            {/* Link Existing Card */}
            <ActionCard
              active={activeTab === 'link'}
              onClick={() => handleTabChange('link')}
              icon={<Wallet className="w-4.5 h-4.5" />}
              title="Link Wallet"
              subtitle="Bind an extension wallet to a passkey"
              disabled={isBusy}
            >
              {activeTab === 'link' && (
                <div className="pt-3 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {wallet.envSupported || wallet.providerDetected
                      ? 'Connect your IOTA extension (Chrome, Safari, Nightly), sign a proof, then create a passkey for passwordless access.'
                      : 'Extension linking requires a desktop browser with a wallet extension installed.'}
                  </p>

                  {/* Wallet detection */}
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {wallet.connectStatus === 'detecting' ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Scanning for wallets…
                          </p>
                        ) : wallet.connectedAddress ? (
                          <p className="text-xs">
                            <span className="text-emerald-500 font-medium">Connected: </span>
                            <span className="font-mono text-foreground">{wallet.connectedAddress.slice(0, 10)}…{wallet.connectedAddress.slice(-6)}</span>
                          </p>
                        ) : wallet.providerDetected ? (
                          <p className="text-xs text-muted-foreground">
                            {wallet.providerName || 'Wallet'} detected
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No wallet extension found
                          </p>
                        )}
                      </div>
                      {wallet.providerDetected && !wallet.connectedAddress && wallet.connectStatus !== 'detecting' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-3 rounded-lg border-primary/40 text-primary"
                          onClick={wallet.connectWallet}
                          disabled={wallet.connectStatus === 'connecting'}
                        >
                          {wallet.connectStatus === 'connecting' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Connect'}
                        </Button>
                      )}
                    </div>
                    {wallet.error && <p className="text-[11px] text-destructive">{wallet.error}</p>}
                  </div>

                  {/* Step indicator when binding */}
                  {isBinding && (
                    <div className="flex items-center gap-1.5 py-1">
                      <StepPill active={currentStep === 'wallet_proof'} complete={currentStep !== 'wallet_proof' && currentStep !== 'idle'} label="Sign" />
                      <div className="h-px flex-1 bg-border/50" />
                      <StepPill active={currentStep === 'passkey_create'} complete={currentStep === 'verifying' || currentStep === 'complete'} label="Passkey" />
                      <div className="h-px flex-1 bg-border/50" />
                      <StepPill active={currentStep === 'verifying'} complete={currentStep === 'complete'} label="Verify" />
                    </div>
                  )}

                  <Button
                    onClick={handleBindWallet}
                    disabled={isBinding || (!wallet.connectedAddress && !walletAddress) || !onSignPersonalMessage}
                    variant="outline"
                    className="w-full h-11 border-primary/40 text-primary hover:bg-primary/10 font-semibold rounded-xl"
                  >
                    {isBinding ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {currentStep === 'wallet_proof' ? 'Signing…' : currentStep === 'passkey_create' ? 'Creating Passkey…' : 'Verifying…'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Link & Create Passkey
                      </span>
                    )}
                  </Button>

                  {!wallet.envSupported && !wallet.providerDetected && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      Use <strong>Create New</strong> or <strong>Sign In</strong> instead on this device.
                    </p>
                  )}
                </div>
              )}
            </ActionCard>
          </div>

          {/* Active bindings (collapsible) */}
          {bindings.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setShowBindings(!showBindings)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{bindings.length} active passkey{bindings.length > 1 ? 's' : ''}</span>
                <ChevronRight className={cn("w-3 h-3 transition-transform ml-auto", showBindings && "rotate-90")} />
              </button>
              {showBindings && (
                <div className="mt-2 space-y-1.5">
                  {bindings.map((binding) => (
                    <BindingCard
                      key={binding.id}
                      binding={binding}
                      confirmUnbind={confirmUnbind}
                      onConfirmUnbind={setConfirmUnbind}
                      onUnbind={handleUnbind}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── Action Card ─────────── */
function ActionCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        active
          ? 'border-primary/30 bg-primary/5 shadow-sm'
          : 'border-border/40 bg-muted/10 hover:border-border/60 hover:bg-muted/20 cursor-pointer',
        disabled && !active && 'opacity-50 pointer-events-none'
      )}
    >
      <button
        onClick={onClick}
        disabled={disabled && !active}
        className={cn(
          'flex items-center gap-3 w-full text-left p-3.5',
          active && 'pb-0'
        )}
      >
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
          active ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-muted-foreground'
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', active ? 'text-foreground' : 'text-foreground/80')}>
            {title}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        </div>
        {!active && <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />}
      </button>
      {children && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

/* ─────────── Binding Card ─────────── */
function BindingCard({
  binding,
  confirmUnbind,
  onConfirmUnbind,
  onUnbind,
}: {
  binding: PasskeyBinding;
  confirmUnbind: string | null;
  onConfirmUnbind: (id: string | null) => void;
  onUnbind: (id: string) => void;
}) {
  const isConfirming = confirmUnbind === binding.id;
  const createdDate = new Date(binding.createdAt).toLocaleDateString();

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/30 bg-muted/5">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <KeyRound className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-mono truncate">
          {binding.iotaWalletAddress.slice(0, 8)}…{binding.iotaWalletAddress.slice(-6)}
        </p>
        <p className="text-[10px] text-muted-foreground">{createdDate}</p>
      </div>
      {isConfirming ? (
        <div className="flex gap-1">
          <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2 rounded-md" onClick={() => onUnbind(binding.id)}>
            Remove
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-md" onClick={() => onConfirmUnbind(null)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive rounded-md"
          onClick={() => onConfirmUnbind(binding.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

/* ─────────── Step Pill ─────────── */
function StepPill({ active, complete, label }: { active: boolean; complete: boolean; label: string }) {
  return (
    <span className={cn(
      'text-[10px] font-medium px-2 py-0.5 rounded-full transition-all',
      complete ? 'bg-emerald-500/15 text-emerald-500' :
      active ? 'bg-primary/15 text-primary ring-1 ring-primary/30' :
      'bg-muted/30 text-muted-foreground'
    )}>
      {complete ? '✓ ' : ''}{label}
    </span>
  );
}

/* ─────────── Mobile Wallet Fallback ─────────── */
function MobileWalletFallback() {
  // Detect: mobile device, AND no injected wallet (so user can't passkey/extension link)
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPod|iPad/.test(ua);
    const hasInjected = !!(window as any).nightly?.iota || !!(window as any).iota || !!(globalThis as any).__iotaWalletStandard;
    // Show on mobile when no injected wallet, OR always on mobile (gives users escape hatch)
    setShouldShow(isMobile && !hasInjected);
  }, []);

  if (!shouldShow) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://vanity.box';
  // Nightly deep link: opens the dapp inside Nightly's in-app browser where window.nightly.iota is injected
  const nightlyDeepLink = `nightly://browse?url=${encodeURIComponent(currentUrl)}`;
  // Slush web wallet (formerly Sui Wallet web) — opens the hosted wallet
  const slushWebUrl = 'https://my.slush.app/';

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Mobile wallet</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            Passkey not working? Open Vanity.box inside your wallet's in-app browser to connect.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          asChild
          variant="outline"
          className="h-10 text-xs font-semibold rounded-xl border-primary/40 text-primary hover:bg-primary/10"
        >
          <a href={nightlyDeepLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Nightly
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-10 text-xs font-semibold rounded-xl border-primary/40 text-primary hover:bg-primary/10"
        >
          <a href={slushWebUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Slush Web
          </a>
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Tip: in Nightly, tap the <strong>Browser</strong> tab and enter <strong>vanity.box</strong>.
      </p>
    </div>
  );
}
