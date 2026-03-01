// Passkey Wallet Modal - Create passkey wallet or bind existing wallet

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { usePasskeyWallet } from '@/hooks/usePasskeyWallet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PasskeyBinding } from '@/types/passkey';

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

  useEffect(() => {
    if (open && walletAddress) {
      loadBindings();
    }
  }, [open, walletAddress, loadBindings]);

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
        <DialogContent className="sm:max-w-md">
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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            Passkey Wallet
          </DialogTitle>
          <DialogDescription>
            Create a passkey-backed wallet or link your existing wallet for passwordless sign-in.
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
                Sign a proof message with your connected IOTA wallet, then create a passkey
                for passwordless access. Your extension wallet remains the signing authority.
              </p>
            </div>

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
              disabled={isCreating || isBinding || !onSignPersonalMessage}
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

            {!onSignPersonalMessage && (
              <p className="text-xs text-muted-foreground text-center">
                Connect your IOTA wallet extension to enable linking.
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
