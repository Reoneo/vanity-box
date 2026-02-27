// Bind existing IOTA wallet to a passkey — one-time migration modal
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Fingerprint,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  requestBindChallenge,
  createPasskeyCredential,
  registerPasskey,
} from '@/lib/passkey';

interface BindIotaPasskeyModalProps {
  open: boolean;
  onClose: () => void;
  iotaWalletAddress: string;
  signMessage: (message: string) => Promise<string>;
}

type BindStep = 'intro' | 'signing' | 'creating-passkey' | 'registering' | 'done' | 'error';

export function BindIotaPasskeyModal({
  open,
  onClose,
  iotaWalletAddress,
  signMessage,
}: BindIotaPasskeyModalProps) {
  const [step, setStep] = useState<BindStep>('intro');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBind = useCallback(async () => {
    if (!iotaWalletAddress) {
      toast.error('No IOTA wallet connected');
      return;
    }

    if (!isWebAuthnSupported()) {
      toast.error('Passkeys are not supported in this browser');
      setErrorMsg('Your browser does not support WebAuthn / passkeys.');
      setStep('error');
      return;
    }

    const hasPlatform = await isPlatformAuthenticatorAvailable();
    if (!hasPlatform) {
      toast.error('No platform authenticator available');
      setErrorMsg('No Face ID / Touch ID / Windows Hello detected on this device.');
      setStep('error');
      return;
    }

    setIsProcessing(true);
    setStep('signing');
    setErrorMsg('');

    try {
      // 1. Get challenge from server
      const { challenge, hasExistingPasskey } = await requestBindChallenge(iotaWalletAddress);

      if (hasExistingPasskey) {
        const proceed = window.confirm(
          'You already have a passkey bound to this wallet. Binding a new one will revoke the old passkey. Continue?'
        );
        if (!proceed) {
          setStep('intro');
          setIsProcessing(false);
          return;
        }
      }

      // 2. Sign the challenge with IOTA wallet
      const walletMessage = [
        'Vanity.box Passkey Binding',
        '',
        `Wallet: ${iotaWalletAddress}`,
        `Challenge: ${challenge}`,
        `Action: Bind passkey to IOTA wallet`,
        `Timestamp: ${new Date().toISOString()}`,
      ].join('\n');

      const walletSignature = await signMessage(walletMessage);

      // 3. Create passkey
      setStep('creating-passkey');
      const credential = await createPasskeyCredential(iotaWalletAddress, challenge);

      // 4. Register on server
      setStep('registering');
      const result = await registerPasskey(
        iotaWalletAddress,
        challenge,
        walletSignature,
        walletMessage,
        credential
      );

      if (result.success) {
        setStep('done');
        toast.success('Passkey bound to your IOTA wallet!');
      } else {
        throw new Error('Server registration failed');
      }
    } catch (err: any) {
      console.error('Passkey bind error:', err);
      const msg = err?.message || 'Failed to bind passkey';
      if (msg.includes('cancelled') || msg.includes('AbortError') || msg.includes('NotAllowedError')) {
        setErrorMsg('Passkey creation was cancelled. Please try again.');
      } else if (msg.includes('rejected') || msg.includes('denied')) {
        setErrorMsg('Wallet signature was rejected.');
      } else {
        setErrorMsg(msg);
      }
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  }, [iotaWalletAddress, signMessage]);

  const handleClose = () => {
    if (!isProcessing) {
      setStep('intro');
      setErrorMsg('');
      onClose();
    }
  };

  const stepLabels: Record<BindStep, string> = {
    intro: 'Ready',
    signing: 'Signing with wallet…',
    'creating-passkey': 'Creating passkey…',
    registering: 'Registering on server…',
    done: 'Complete!',
    error: 'Error',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            Bind Passkey to IOTA Wallet
          </DialogTitle>
          <DialogDescription>
            One-time setup: sign with your IOTA wallet, then create a passkey for future logins without an extension.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Wallet info */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs font-mono truncate flex-1">{iotaWalletAddress}</span>
            <Badge variant="outline" className="text-[10px]">IOTA</Badge>
          </div>

          {/* Step indicator */}
          {step !== 'intro' && step !== 'done' && step !== 'error' && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
              <span className="text-sm text-primary font-medium">{stepLabels[step]}</span>
            </div>
          )}

          {/* Intro */}
          {step === 'intro' && (
            <div className="space-y-3">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Sign a challenge message with your connected IOTA wallet</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Create a passkey using Face ID, Touch ID, or biometrics</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>Future logins use passkey only — no extension needed</span>
                </div>
              </div>

              <Button
                onClick={handleBind}
                disabled={isProcessing}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                Start Binding
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Passkey bound successfully!
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You can now sign in with your passkey — no IOTA wallet extension needed.
                  </p>
                </div>
              </div>
              <Button onClick={handleClose} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
              <Button
                onClick={() => setStep('intro')}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
