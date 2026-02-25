import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Wallet, CheckCircle2, AlertTriangle, Link2, ShieldCheck, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useSignMessage, useConnect, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { callEdge } from '@/lib/supaInvoke';
import { useIdentity } from '@/contexts/IdentityContext';
import { setEvmLinking } from '@/contexts/WalletConnectContext';
import type { VerifiableCredential } from '@/types/identity';
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
  const { openConnectModal } = useConnectModal();
  const { connectors, connectAsync } = useConnect();
  const { disconnect: disconnectEvm } = useDisconnect();
  const { holderDid, vcList, addExternalCredential, removeCredentialByType } = useIdentity();

  const [step, setStep] = useState<LinkStep>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [issuedVcJwt, setIssuedVcJwt] = useState<string | null>(null);

  // Track if we're waiting for wallet connection to auto-proceed
  const pendingSignRef = useRef(false);

  const [isUnlinking, setIsUnlinking] = useState(false);

  const existingEvmVc = vcList.find(
    vc => vc.type === 'EthereumWalletOwnershipCredential'
  );

  // Set/clear EVM linking flag on open/close
  useEffect(() => {
    if (open) {
      setEvmLinking(true);
    }
    return () => {
      setEvmLinking(false);
    };
  }, [open]);

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
        { holderDid, address: signerAddress, message, signature, iotaName }
      );

      if (response?.vcJwt) {
        // Construct and persist the VC into the identity vault
        const newVc: VerifiableCredential = {
          vcJwt: response.vcJwt,
          issuerDid: response.issuerDid,
          type: 'EthereumWalletOwnershipCredential',
          issuedAt: response.issuedAt || new Date().toISOString(),
          claims: {
            name: iotaName,
            chain: 'Ethereum',
            address: signerAddress,
          },
        };

        await addExternalCredential(newVc);

        // Persist link in localStorage for cross-component access (fallback when DB hasn't propagated)
        try {
          localStorage.setItem(`iota-linked-evm:${iotaName.toLowerCase()}`, signerAddress.toLowerCase());
        } catch {}

        setIssuedVcJwt(response.vcJwt);
        setStep('done');

        // Notify SearchInterface immediately so NFTs/POAPs load
        window.dispatchEvent(new CustomEvent('iota-evm-linked', {
          detail: { iotaName: iotaName.toLowerCase(), evmAddress: signerAddress.toLowerCase() },
        }));

        // Auto-disconnect EVM wallet silently (linking flag is still active)
        try { disconnectEvm(); } catch {}

        toast.success('Ethereum wallet linked — disconnected');
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
  }, [holderDid, iotaName, signMessageAsync, disconnectEvm, addExternalCredential]);

  // When wallet connects while we're waiting, auto-proceed to sign
  useEffect(() => {
    if (pendingSignRef.current && isConnected && address && step === 'awaiting-wallet') {
      pendingSignRef.current = false;
      performSignAndIssue(address);
    }
  }, [isConnected, address, step, performSignAndIssue]);

  const handleSignAndLink = useCallback(async () => {
    if (!holderDid) {
      toast.error('Create a DID in the Identity tab first');
      return;
    }

    if (isConnected && address) {
      performSignAndIssue(address);
    } else {
      pendingSignRef.current = true;
      setStep('awaiting-wallet');
      
      if (openConnectModal) {
        console.log('[LinkEthWallet] Opening RainbowKit modal (events suppressed)');
        openConnectModal();
      } else {
        console.log('[LinkEthWallet] No RainbowKit modal, using connectAsync fallback');
        try {
          const wcConnector = connectors.find(c => c.id === 'walletConnect') 
                           || connectors.find(c => c.type === 'walletConnect')
                           || connectors[0];
          if (wcConnector) {
            const result = await connectAsync({ connector: wcConnector });
            if (result?.accounts?.[0]) {
              pendingSignRef.current = false;
              performSignAndIssue(result.accounts[0]);
            }
          } else {
            toast.error('No wallet connectors available');
            setStep('error');
            setErrorMsg('No wallet connectors available. Please refresh and try again.');
          }
        } catch (err: any) {
          console.error('[LinkEthWallet] connectAsync failed:', err);
          pendingSignRef.current = false;
          setStep('error');
          setErrorMsg(err?.message || 'Failed to connect wallet');
        }
      }
    }
  }, [holderDid, isConnected, address, performSignAndIssue, openConnectModal, connectors, connectAsync]);

  const handleDisconnectEvm = useCallback(() => {
    try { disconnectEvm(); } catch {}
  }, [disconnectEvm]);

  const handleClose = () => {
    pendingSignRef.current = false;
    // If EVM was connected during linking but flow didn't complete, disconnect it
    if (isConnected && step !== 'done') {
      try { disconnectEvm(); } catch {}
    }
    setEvmLinking(false);
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[26rem] mx-auto p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto">
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
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Wallet already linked
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-mono break-all leading-relaxed">
                  {existingEvmVc.claims.address}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  disabled={isUnlinking}
                  onClick={async () => {
                    setIsUnlinking(true);
                    try {
                      // 1. Remove VC from vault
                      await removeCredentialByType('EthereumWalletOwnershipCredential');
                      // 2. Clear localStorage
                      try { localStorage.removeItem(`iota-linked-evm:${iotaName.toLowerCase()}`); } catch {}
                      // 3. Delete DB row via edge function
                      try { await callEdge('delete-iota-linked-evm', { iotaName: iotaName.toLowerCase() }); } catch (e) { console.warn('DB delete failed (may not exist):', e); }
                      // 4. Dispatch unlink event
                      window.dispatchEvent(new CustomEvent('iota-evm-unlinked', { detail: { iotaName: iotaName.toLowerCase() } }));
                      // 5. Reset modal
                      setStep('idle');
                      setIssuedVcJwt(null);
                      toast.success('Ethereum wallet unlinked');
                    } catch (err: any) {
                      toast.error(err?.message || 'Failed to unlink');
                    } finally {
                      setIsUnlinking(false);
                    }
                  }}
                >
                  {isUnlinking ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Unlinking…</> : 'Unlink Wallet'}
                </Button>
              </div>
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">Ethereum Wallet</p>
              {isConnected && address ? (
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono break-all leading-relaxed">{address}</p>
              ) : (
                <p className="text-[10px] sm:text-xs text-muted-foreground">Not connected — will prompt on sign</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isConnected && (
                <>
                  <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Connected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleDisconnectEvm}
                    title="Disconnect Ethereum"
                  >
                    <Unplug className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* DID status */}
          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">IOTA DID</p>
              {holderDid ? (
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono break-all leading-relaxed">{holderDid}</p>
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
                  Credential issued & EVM wallet disconnected
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

          {/* Actions — sticky at bottom */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2 sticky bottom-0 bg-background pb-1">
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
