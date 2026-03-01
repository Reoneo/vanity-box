// Passkey Wallet Modal - Create / Sign In / Link Existing
// 3-tab design with isolated state per tab

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Globe,
  LogIn,
  Monitor,
} from 'lucide-react';
import { usePasskeyWallet } from '@/hooks/usePasskeyWallet';
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

  // Chromium desktop (Chrome, Brave, Edge, Opera)
  const isChromium = /Chrome|Chromium|CriOS/.test(ua) || /Edg/.test(ua) || /Brave/.test(ua);
  // Safari detection – exclude Chrome/Edge/Firefox/Opera
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|Firefox|OPR|Opera/.test(ua);
  // iPad Safari: "Macintosh" + touch or explicit "iPad"
  const isIPadSafari = isSafari && (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1));
  const isMacSafari = isSafari && /Macintosh/.test(ua) && !isIPadSafari;

  // Mobile phones are excluded for extension linking
  const isMobilePhone = /Android|iPhone|iPod/.test(ua);

  if (isMobilePhone) return false;
  if (isChromium) return true;
  if (isMacSafari || isIPadSafari) return true;

  return false;
}

/* ─────────── Emit passkey wallet connection ─────────── */
function emitPasskeyWalletConnected(address: string) {
  sessionStorage.setItem(PASSKEY_IOTA_SESSION_KEY, address);
  window.dispatchEvent(new CustomEvent('wallet-connected', {
    detail: {
      walletAddress: address,
      walletType: 'iota',
      username: null,
      source: 'passkey',
    },
  }));
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

  // Re-evaluate env support when modal opens
  useEffect(() => {
    if (modalOpen) setEnvSupported(isExtensionCapableBrowser());
  }, [modalOpen]);

  // Detect wallet providers
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
      // 1) Wallet Standard
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
              setEnvSupported(true); // override if provider actually found
            }
            return true;
          }
          // Register listener for late wallet registration
          unsubWS = ws.on('register', () => {
            if (!cancelled) checkProviders();
          });
        }
      } catch { /* ignore */ }

      // 2) Nightly injected
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

      // 3) Legacy window.iota
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

    // Poll for late injection — increased to 40 attempts for Safari/slow extensions
    const interval = setInterval(() => {
      if (cancelled) return;
      if (checkProviders()) {
        clearInterval(interval);
        return;
      }
      attempts++;
      if (attempts > 40) {
        clearInterval(interval);
        if (!cancelled) {
          setConnectStatus('idle');
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubWS?.();
    };
  }, [modalOpen]);

  const connectWallet = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider) {
      setError('No wallet provider detected');
      return;
    }

    setConnectStatus('connecting');
    setError(null);

    try {
      // Wallet Standard provider
      if (provider.features?.['standard:connect']) {
        const connectFeature = provider.features['standard:connect'] as { connect: () => Promise<any> };
        const connectResult = await connectFeature.connect();
        // connectResult may have { accounts: [...] } or provider.accounts may be populated
        const accounts = connectResult?.accounts || provider.accounts || [];
        if (accounts.length > 0) {
          const addr = accounts[0]?.address || accounts[0];
          setConnectedAddress(addr);
          setConnectStatus('connected');
          return;
        }
        throw new Error('No accounts returned after connect');
      }

      // Injected provider (nightly or legacy)
      const injected = provider.provider || provider;
      if (injected?.connect) {
        const result = await injected.connect();
        let address: string | null = null;

        // Parse diverse result shapes
        if (typeof result === 'object' && result !== null) {
          if (result.address) address = result.address;
          else if (Array.isArray(result.accounts)) address = result.accounts[0]?.address || result.accounts[0];
          else if (Array.isArray(result)) address = result[0]?.address || result[0];
        }

        // Fallback: try getAccounts or request
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
        // Fallback: provider.accounts
        if (!address && injected.accounts?.length) {
          address = injected.accounts[0]?.address || injected.accounts[0];
        }

        if (address) {
          setConnectedAddress(address);
          setConnectStatus('connected');
          return;
        }
        throw new Error('Failed to connect');
      }

      throw new Error('Provider does not support connect');
    } catch (err: any) {
      console.error('Wallet connect error:', err);
      setError(err.message || 'Failed to connect wallet');
      setConnectStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setConnectedAddress(null);
    setConnectStatus('idle');
    setError(null);
  }, []);

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

  const wallet = useIotaWalletDetection(open);

  const [activeTab, setActiveTab] = useState('create');
  const [confirmUnbind, setConfirmUnbind] = useState<string | null>(null);

  // Per-tab errors (isolated)
  const [createError, setCreateError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Clear tab errors when switching
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCreateError(null);
    setSignInError(null);
    setLinkError(null);
    resetHookError();
  };

  // Load bindings when modal opens with a wallet
  useEffect(() => {
    if (open && walletAddress) loadBindings();
  }, [open, walletAddress, loadBindings]);

  // Emit passkey wallet connection when createdWalletAddress changes
  useEffect(() => {
    if (createdWalletAddress && currentStep === 'complete') {
      emitPasskeyWalletConnected(createdWalletAddress);
    }
  }, [createdWalletAddress, currentStep]);

  /* ── Create Wallet Handler ── */
  const handleCreateWallet = async () => {
    setCreateError(null);
    const success = await createPasskeyWallet();
    if (success) {
      toast.success('Passkey wallet created successfully');
    } else if (hookError) {
      setCreateError(hookError);
    }
  };

  /* ── Sign In Handler ── */
  const handleSignIn = async () => {
    setSignInError(null);
    const binding = await loginWithPasskey();
    if (binding) {
      const addr = (binding as any)?.iotaWalletAddress || (binding as any)?.walletAddress;
      if (addr) {
        emitPasskeyWalletConnected(addr);
      }
      toast.success('Signed in with passkey');
    } else if (hookError) {
      setSignInError(hookError);
    }
  };

  /* ── Link Existing Handler ── */
  const handleBindWallet = async () => {
    setLinkError(null);
    if (!wallet.connectedAddress && !walletAddress) {
      setLinkError('Connect your IOTA wallet extension first');
      return;
    }
    if (!onSignPersonalMessage) {
      setLinkError('Wallet signing not available. Connect your extension wallet first.');
      return;
    }
    const success = await bindExistingWallet(onSignPersonalMessage);
    if (success) {
      toast.success('Wallet bound to passkey');
    } else if (hookError) {
      setLinkError(hookError);
    }
  };

  const handleUnbind = async (bindingId: string) => {
    const success = await unbindPasskey(bindingId);
    if (success) {
      toast.success('Passkey unbound');
      setConfirmUnbind(null);
    }
  };

  const currentTabError = activeTab === 'create' ? createError : activeTab === 'signin' ? signInError : linkError;

  if (!isAvailable) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md mx-4 max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              Passkey Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertTriangle className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              WebAuthn is not available on this device or browser.
              Passkey wallets require a compatible browser with biometric or PIN support.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            Passkey Wallet
          </DialogTitle>
          <DialogDescription>
            Create, sign in, or link a passkey-backed IOTA wallet.
          </DialogDescription>
        </DialogHeader>

        {/* Active bindings */}
        {bindings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Passkeys
            </p>
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

        {/* Tab-scoped error */}
        {currentTabError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{currentTabError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (activeTab === 'create') setCreateError(null);
                else if (activeTab === 'signin') setSignInError(null);
                else setLinkError(null);
                resetHookError();
              }}
              className="ml-auto text-xs h-6"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Success */}
        {currentStep === 'complete' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Passkey operation completed successfully!
            </p>
          </div>
        )}

        {/* 3 Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" className="text-[10px] sm:text-xs px-1">
              <KeyRound className="w-3 h-3 mr-1" />
              Create
            </TabsTrigger>
            <TabsTrigger value="signin" className="text-[10px] sm:text-xs px-1">
              <LogIn className="w-3 h-3 mr-1" />
              Sign In
            </TabsTrigger>
            <TabsTrigger value="link" className="text-[10px] sm:text-xs px-1">
              <Wallet className="w-3 h-3 mr-1" />
              Link
            </TabsTrigger>
          </TabsList>

          {/* ── CREATE TAB ── */}
          <TabsContent value="create" className="space-y-3 mt-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <p className="text-sm font-medium">New Passkey Wallet</p>
              <p className="text-xs text-muted-foreground">
                Create a new IOTA wallet backed by your device's biometric or PIN.
                No browser extension needed — your passkey is your private key.
              </p>
              {!hasPlatformAuth && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠ No platform authenticator detected. You may need a security key.
                </p>
              )}
            </div>

            <Button
              onClick={handleCreateWallet}
              disabled={isCreating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentStep === 'passkey_create'
                    ? 'Creating Passkey…'
                    : currentStep === 'verifying'
                    ? 'Verifying…'
                    : 'Processing…'}
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Create Passkey Wallet
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </TabsContent>

          {/* ── SIGN IN TAB ── */}
          <TabsContent value="signin" className="space-y-3 mt-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <p className="text-sm font-medium">Sign In with Passkey</p>
              <p className="text-xs text-muted-foreground">
                Authenticate with an existing passkey credential. No extension required — 
                use your device biometric or PIN to connect your passkey wallet.
              </p>
            </div>

            <Button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In with Passkey
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </TabsContent>

          {/* ── LINK EXISTING TAB ── */}
          <TabsContent value="link" className="space-y-3 mt-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <p className="text-sm font-medium">Link Existing Wallet</p>
              <p className="text-xs text-muted-foreground">
                {wallet.envSupported || wallet.providerDetected
                  ? 'Connect your IOTA wallet extension (including Safari/Nightly), sign a proof, then create a passkey for passwordless access.'
                  : 'Extension-based wallet linking requires a compatible browser with a wallet extension (Chrome, Brave, Edge, Safari). You can still create or sign in with a passkey on this device.'}
              </p>
            </div>

            {/* Wallet detection status */}
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {!wallet.envSupported && !wallet.providerDetected ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Extension linking is available on desktop browsers with a compatible wallet extension (Chrome, Brave, Edge, Safari + Nightly).
                    </p>
                  ) : wallet.connectStatus === 'detecting' ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Detecting wallet extension…
                    </p>
                  ) : wallet.connectedAddress ? (
                    <p className="text-xs text-foreground">
                      <span className="text-emerald-500 font-medium">Connected:</span>{' '}
                      <span className="font-mono">{wallet.connectedAddress.slice(0, 10)}…{wallet.connectedAddress.slice(-6)}</span>
                    </p>
                  ) : wallet.providerDetected ? (
                    <p className="text-xs text-muted-foreground">
                      {wallet.providerName || 'IOTA Wallet'} detected
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No compatible wallet extension found.
                    </p>
                  )}
                </div>
                {/* Show connect button when provider is detected, even if envSupported was initially false */}
                {wallet.providerDetected && !wallet.connectedAddress && wallet.connectStatus !== 'detecting' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-3 border-primary/50 text-primary"
                    onClick={wallet.connectWallet}
                    disabled={wallet.connectStatus === 'connecting'}
                  >
                    {wallet.connectStatus === 'connecting' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </Button>
                )}
              </div>
              {wallet.error && (
                <p className="text-xs text-destructive mt-1.5">{wallet.error}</p>
              )}
            </div>

            {/* Binding step indicator */}
            {isBinding && (
              <div className="flex items-center gap-2 py-2">
                <StepDot active={currentStep === 'wallet_proof'} complete={currentStep !== 'wallet_proof' && currentStep !== 'idle'} label="1. Sign" />
                <div className="h-px flex-1 bg-border" />
                <StepDot active={currentStep === 'passkey_create'} complete={currentStep === 'verifying' || currentStep === 'complete'} label="2. Passkey" />
                <div className="h-px flex-1 bg-border" />
                <StepDot active={currentStep === 'verifying'} complete={currentStep === 'complete'} label="3. Verify" />
              </div>
            )}

            <Button
              onClick={handleBindWallet}
              disabled={isBinding || (!wallet.connectedAddress && !walletAddress) || !onSignPersonalMessage}
              variant="outline"
              className="w-full border-primary/50 text-primary hover:bg-primary/10 font-semibold"
            >
              {isBinding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentStep === 'wallet_proof'
                    ? 'Sign with Wallet…'
                    : currentStep === 'passkey_create'
                    ? 'Create Passkey…'
                    : currentStep === 'verifying'
                    ? 'Verifying…'
                    : 'Processing…'}
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Link &amp; Create Passkey
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            {!wallet.envSupported && !wallet.providerDetected && (
              <p className="text-xs text-muted-foreground text-center">
                Use the <strong>Create</strong> or <strong>Sign In</strong> tabs instead.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── Sub-components ─────────── */

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
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/5">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <ShieldCheck className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium truncate">
            {binding.iotaWalletAddress.slice(0, 8)}…{binding.iotaWalletAddress.slice(-6)}
          </p>
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] px-1.5 py-0',
              binding.bindingLevel === 'passkey_wallet'
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-muted-foreground border-border'
            )}
          >
            {binding.bindingLevel === 'passkey_wallet' ? 'Passkey' : 'Linked'}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Created {createdDate} · Sign count: {binding.signCount}
        </p>
      </div>
      <div className="flex-shrink-0">
        {isConfirming ? (
          <div className="flex gap-1">
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => onUnbind(binding.id)}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => onConfirmUnbind(null)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onConfirmUnbind(binding.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function StepDot({
  active,
  complete,
  label,
}: {
  active: boolean;
  complete: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
          complete
            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50'
            : active
            ? 'bg-primary/20 text-primary border border-primary/50 ring-2 ring-primary/20'
            : 'bg-muted/30 text-muted-foreground border border-muted/50'
        )}
      >
        {complete ? '✓' : active ? '•' : '○'}
      </div>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}
