// Passkey Wallet Modal - Create passkey wallet or bind existing wallet
// Supports IOTA Wallet extension detection (Chrome/Chromium only)

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { usePasskeyWallet } from '@/hooks/usePasskeyWallet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PasskeyBinding } from '@/types/passkey';

// Extend Window for IOTA wallet extension
declare global {
  interface Window {
    iota?: {
      connect: () => Promise<boolean>;
      disconnect: () => Promise<void>;
      request: (params: { method: string; params?: any }) => Promise<any>;
      getAccounts?: () => Promise<string[]>;
    };
  }
}

interface PasskeyWalletModalProps {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
  onSignPersonalMessage?: (message: Uint8Array) => Promise<{ signature: string }>;
}

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
    error,
    currentStep,
    createPasskeyWallet,
    bindExistingWallet,
    unbindPasskey,
    loadBindings,
    resetError,
  } = usePasskeyWallet(walletAddress);

  const [confirmUnbind, setConfirmUnbind] = useState<string | null>(null);

  // IOTA extension detection state
  const [hasIotaExtension, setHasIotaExtension] = useState(false);
  const [iotaDetecting, setIotaDetecting] = useState(true);
  const [iotaConnecting, setIotaConnecting] = useState(false);
  const [iotaExtAddress, setIotaExtAddress] = useState<string | null>(null);

  // Poll for window.iota injection (extension may load after page)
  useEffect(() => {
    if (!open) return;
    setIotaDetecting(true);

    let attempts = 0;
    const interval = setInterval(() => {
      if (window.iota) {
        setHasIotaExtension(true);
        setIotaDetecting(false);
        clearInterval(interval);
        return;
      }
      attempts++;
      if (attempts > 10) {
        setHasIotaExtension(false);
        setIotaDetecting(false);
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [open]);

  // Explicit connect to IOTA extension
  const handleIotaConnect = useCallback(async () => {
    if (!window.iota) {
      toast.error('IOTA Wallet extension not found. Please use Chrome with the extension installed.');
      return;
    }

    setIotaConnecting(true);
    try {
      const isConnected = await window.iota.connect();
      if (isConnected) {
        // Try to get accounts
        let accounts: string[] = [];
        if (window.iota.getAccounts) {
          accounts = await window.iota.getAccounts();
        } else {
          // Fallback: use request method
          try {
            const result = await window.iota.request({ method: 'standard:connect' });
            if (result && Array.isArray(result)) {
              accounts = result;
            } else if (result?.accounts) {
              accounts = result.accounts.map((a: any) => a.address || a);
            }
          } catch {
            // connect() was enough
          }
        }

        if (accounts.length > 0) {
          setIotaExtAddress(accounts[0]);
          toast.success('IOTA wallet connected');
        } else {
          toast.info('Connected but no accounts found');
        }
      }
    } catch (err: any) {
      console.error('IOTA extension connect error:', err);
      toast.error(err.message || 'Failed to connect IOTA wallet');
    } finally {
      setIotaConnecting(false);
    }
  }, []);

  useEffect(() => {
    if (open && (walletAddress || iotaExtAddress)) {
      loadBindings();
    }
  }, [open, walletAddress, iotaExtAddress, loadBindings]);

  const effectiveWalletAddress = iotaExtAddress || walletAddress;

  const handleCreateWallet = async () => {
    const success = await createPasskeyWallet();
    if (success) {
      toast.success('Passkey wallet created successfully');
    }
  };

  const handleBindWallet = async () => {
    if (!onSignPersonalMessage) {
      toast.error('Wallet signing not available');
      return;
    }
    const success = await bindExistingWallet(onSignPersonalMessage);
    if (success) {
      toast.success('Wallet bound to passkey successfully');
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
        <DialogContent className="sm:max-w-md mx-4">
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
            Create a passkey-backed wallet or link your existing wallet for passwordless sign-in.
          </DialogDescription>
        </DialogHeader>

        {/* IOTA Extension Status */}
        <div className="p-3 rounded-lg border border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {iotaDetecting ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Detecting IOTA Wallet extension…
                </p>
              ) : hasIotaExtension ? (
                iotaExtAddress ? (
                  <p className="text-xs text-foreground">
                    <span className="text-emerald-500 font-medium">Connected:</span>{' '}
                    <span className="font-mono">{iotaExtAddress.slice(0, 10)}…{iotaExtAddress.slice(-6)}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    IOTA Wallet extension detected
                  </p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  No IOTA Wallet extension found. Use a Chromium browser with the extension installed, or create a passkey wallet below.
                </p>
              )}
            </div>
            {hasIotaExtension && !iotaExtAddress && !iotaDetecting && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-3 border-primary/50 text-primary"
                onClick={handleIotaConnect}
                disabled={iotaConnecting}
              >
                {iotaConnecting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Connect'
                )}
              </Button>
            )}
          </div>
        </div>

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

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={resetError} className="ml-auto text-xs h-6">
              Dismiss
            </Button>
          </div>
        )}

        {/* Success state */}
        {currentStep === 'complete' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Passkey operation completed successfully!
            </p>
          </div>
        )}

        {/* Create/Bind tabs */}
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="text-xs">
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              Create Wallet
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs">
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Link Existing
            </TabsTrigger>
          </TabsList>

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
              disabled={isCreating || isBinding}
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

          <TabsContent value="link" className="space-y-3 mt-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <p className="text-sm font-medium">Link Existing Wallet</p>
              <p className="text-xs text-muted-foreground">
                {hasIotaExtension
                  ? 'Connect your IOTA Wallet extension, sign a proof message, then create a passkey for passwordless access.'
                  : 'Requires the IOTA Wallet extension on a Chromium-based browser (Chrome, Brave, Edge).'}
              </p>
            </div>

            {!hasIotaExtension && !iotaDetecting && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  IOTA Wallet extension not detected. Please install it from the Chrome Web Store and reload.
                </p>
              </div>
            )}

            {/* Step indicator for binding flow */}
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
              disabled={isCreating || isBinding || !hasIotaExtension || (!onSignPersonalMessage && !iotaExtAddress)}
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
                  Link & Create Passkey
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            {!hasIotaExtension && !iotaDetecting && (
              <p className="text-xs text-muted-foreground text-center">
                Or use the <strong>Create Wallet</strong> tab to create a passkey wallet without an extension.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

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
