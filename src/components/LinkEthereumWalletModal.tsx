import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Wallet, CheckCircle2, AlertTriangle, Link2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useSignMessage } from 'wagmi';
import { callEdge } from '@/lib/supaInvoke';
import { useIdentity } from '@/contexts/IdentityContext';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import ethLogoDark from '@/assets/eth-logo-dark.png';

interface LinkEthereumWalletModalProps {
  open: boolean;
  onClose: () => void;
  iotaName: string;
}

type LinkStep = 'idle' | 'awaiting-wallet' | 'sign' | 'issuing' | 'done' | 'error';

export function LinkEthereumWalletModal({ open, onClose, iotaName }: LinkEthereumWalletModalProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openModal } = useWalletConnect();
  const { holderDid, vcList } = useIdentity();

  const [step, setStep] = useState<LinkStep>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [issuedVcJwt, setIssuedVcJwt] = useState<string | null>(null);

  // Track if we're waiting for wallet connection to auto-proceed
  const pendingSignRef = useRef(false);

  const existingEvmVc = vcList.find(
    vc => vc.type === 'EthereumWalletOwnershipCredential' &&
          vc.claims.address?.toLowerCase() === address?.toLowerCase()
  );

  // Core signing + VC issuance logic (assumes wallet is connected)
  const performSignAndIssue = useCallback(async (signerAddress: string) => {
    setIsLoading(true);
    setStep('sign');
    setErrorMsg('');

    try {
      const timestamp = new Date().toISOString();
      const message = [
        `vanity.box wants you to sign in with your Ethereum account:`,
        signerAddress,
        '',
        `Link Ethereum wallet to IOTA identity ${iotaName}`,
        '',
        `DID: ${holderDid}`,
        `URI: https://vanity.box`,
        `Issued At: ${timestamp}`,
      ].join('\n');

      const signature = await signMessageAsync({ message, account: signerAddress as `0x${string}` });

      setStep('issuing');

      const response = await callEdge<{ vcJwt: string; issuerDid: string; issuedAt: string }>(
        'issue-ethereum-vc',
        { holderDid, address: signerAddress, message, signature }
      );

      if (response?.vcJwt) {
        setIssuedVcJwt(response.vcJwt);
        setStep('done');
        toast.success('Ethereum wallet linked successfully!');
      } else {
        throw new Error('Invalid response from credential issuance');
      }
    } catch (error: any) {
      console.error('Link wallet error:', error);
      const msg = error?.message || 'Failed to link wallet';
      if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('denied')) {
        setErrorMsg('Signature request was rejected');
      } else {
        setErrorMsg(msg);
      }
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  }, [holderDid, iotaName, signMessageAsync]);

  // When wallet connects while we're waiting, auto-proceed to sign
  useEffect(() => {
    if (pendingSignRef.current && isConnected && address && step === 'awaiting-wallet') {
      pendingSignRef.current = false;
      performSignAndIssue(address);
    }
  }, [isConnected, address, step, performSignAndIssue]);

  const handleSignAndLink = useCallback(() => {
    if (!holderDid) {
      toast.error('Create a DID in the Identity tab first');
      return;
    }

    if (isConnected && address) {
      // Already connected — go straight to signing
      performSignAndIssue(address);
    } else {
      // Not connected — open RainbowKit modal and wait
      pendingSignRef.current = true;
      setStep('awaiting-wallet');
      openModal();
    }
  }, [holderDid, isConnected, address, performSignAndIssue, openModal]);

  const handleClose = () => {
    pendingSignRef.current = false;
    setStep('idle');
    setErrorMsg('');
    setIssuedVcJwt(null);
    onClose();
  };

  const canSign = !!holderDid;
  const showButton = step !== 'done';
  const buttonLoading = isLoading || step === 'awaiting-wallet';

  const buttonLabel = () => {
    if (step === 'awaiting-wallet') return 'Waiting for wallet…';
    if (isLoading) return 'Processing…';
    if (!isConnected) return 'Connect & Sign';
    return 'Sign & Link';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <img src={ethLogoDark} alt="ETH" className="w-5 h-5 flex-shrink-0" />
            Link Ethereum Wallet
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm leading-relaxed">
            Prove ownership of your Ethereum address and receive a Verifiable Credential binding it to your IOTA identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-2">
          {/* Already linked */}
          {existingEvmVc && (
            <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Wallet already linked
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-mono truncate">
                  {existingEvmVc.claims.address}
                </p>
              </div>
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">Ethereum Wallet</p>
              {isConnected && address ? (
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">{address}</p>
              ) : (
                <p className="text-[10px] sm:text-xs text-muted-foreground">Not connected — will prompt on sign</p>
              )}
            </div>
            {isConnected && (
              <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Connected
              </Badge>
            )}
          </div>

          {/* DID status */}
          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">IOTA DID</p>
              {holderDid ? (
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">{holderDid}</p>
              ) : (
                <p className="text-[10px] sm:text-xs text-amber-500">Create a DID in the Identity tab first</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Step info */}
          {(step === 'idle' || step === 'awaiting-wallet') && !existingEvmVc && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              <p>Clicking <strong>{isConnected ? 'Sign & Link' : 'Connect & Sign'}</strong> will:</p>
              <ol className="list-decimal list-inside mt-1.5 sm:mt-2 space-y-1 text-[11px] sm:text-xs">
                {!isConnected && <li>Open a wallet selector to connect your Ethereum wallet</li>}
                <li>Ask your wallet to sign a proof-of-ownership message</li>
                <li>Send the signature to Vanity.box for verification</li>
                <li>Issue an <code className="text-[#D4AF37]">EthereumWalletOwnershipCredential</code> VC</li>
              </ol>
            </div>
          )}

          {step === 'sign' && (
            <div className="flex items-center gap-2.5 p-3 sm:p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-amber-500 flex-shrink-0" />
              <p className="text-xs sm:text-sm">Waiting for wallet signature…</p>
            </div>
          )}

          {step === 'issuing' && (
            <div className="flex items-center gap-2.5 p-3 sm:p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-[#D4AF37] flex-shrink-0" />
              <p className="text-xs sm:text-sm">Verifying signature & issuing credential…</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex items-start gap-2.5 p-3 sm:p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Credential issued!
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  Your Ethereum address is now linked to {iotaName} via a Verifiable Credential.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="flex items-start gap-2.5 p-3 sm:p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-destructive">Failed</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              {step === 'done' ? 'Close' : 'Cancel'}
            </Button>
            {showButton && (
              <Button
                onClick={handleSignAndLink}
                disabled={!canSign || buttonLoading || !!existingEvmVc}
                className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C4A030] text-black"
              >
                {buttonLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {buttonLabel()}
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    {buttonLabel()}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
