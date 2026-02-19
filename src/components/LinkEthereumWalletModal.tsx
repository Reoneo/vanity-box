import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Wallet, CheckCircle2, AlertTriangle, Link2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useSignMessage, useConnect } from 'wagmi';
import { callEdge } from '@/lib/supaInvoke';
import { useIdentity } from '@/contexts/IdentityContext';
import ethLogoDark from '@/assets/eth-logo-dark.png';

interface LinkEthereumWalletModalProps {
  open: boolean;
  onClose: () => void;
  iotaName: string;
}

type LinkStep = 'connect' | 'sign' | 'issuing' | 'done' | 'error';

export function LinkEthereumWalletModal({ open, onClose, iotaName }: LinkEthereumWalletModalProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { holderDid, vcList } = useIdentity();

  const [step, setStep] = useState<LinkStep>('connect');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [issuedVcJwt, setIssuedVcJwt] = useState<string | null>(null);

  // Check if an EVM VC already exists for this address
  const existingEvmVc = vcList.find(
    vc => vc.type === 'EthereumWalletOwnershipCredential' && 
          vc.claims.address?.toLowerCase() === address?.toLowerCase()
  );

  const handleSignAndLink = useCallback(async () => {
    if (!address || !holderDid) {
      toast.error('Connect your Ethereum wallet and create a DID first');
      return;
    }

    setIsLoading(true);
    setStep('sign');
    setErrorMsg('');

    try {
      // Build SIWE-style message
      const timestamp = new Date().toISOString();
      const message = [
        `vanity.box wants you to sign in with your Ethereum account:`,
        address,
        '',
        `Link Ethereum wallet to IOTA identity ${iotaName}`,
        '',
        `DID: ${holderDid}`,
        `URI: https://vanity.box`,
        `Issued At: ${timestamp}`,
      ].join('\n');

      // Request signature from connected wallet
      const signature = await signMessageAsync({ message, account: address });

      setStep('issuing');

      // Call backend to verify signature and issue VC
      const response = await callEdge<{ vcJwt: string; issuerDid: string; issuedAt: string }>(
        'issue-ethereum-vc',
        {
          holderDid,
          address,
          message,
          signature,
        }
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
      // User rejected in wallet
      if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('denied')) {
        setErrorMsg('Signature request was rejected');
      } else {
        setErrorMsg(msg);
      }
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  }, [address, holderDid, iotaName, signMessageAsync]);

  const handleClose = () => {
    setStep('connect');
    setErrorMsg('');
    setIssuedVcJwt(null);
    onClose();
  };

  const canSign = isConnected && !!address && !!holderDid;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={ethLogoDark} alt="ETH" className="w-5 h-5" />
            Link Ethereum Wallet
          </DialogTitle>
          <DialogDescription>
            Prove ownership of your Ethereum address and receive a Verifiable Credential binding it to your IOTA identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Already linked */}
          {existingEvmVc && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Wallet already linked
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {existingEvmVc.claims.address}
                </p>
              </div>
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Wallet className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Ethereum Wallet</p>
              {isConnected && address ? (
                <p className="text-xs text-muted-foreground font-mono truncate">{address}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
            {isConnected && (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Connected
              </Badge>
            )}
          </div>

          {/* DID status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <ShieldCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">IOTA DID</p>
              {holderDid ? (
                <p className="text-xs text-muted-foreground font-mono truncate">{holderDid}</p>
              ) : (
                <p className="text-xs text-amber-500">Create a DID in the Identity tab first</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Step info */}
          {step === 'connect' && !existingEvmVc && (
            <div className="text-sm text-muted-foreground">
              <p>Clicking <strong>Sign & Link</strong> will:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                <li>Ask your Ethereum wallet to sign a proof-of-ownership message</li>
                <li>Send the signature to Vanity.box for verification</li>
                <li>Issue an <code className="text-[#D4AF37]">EthereumWalletOwnershipCredential</code> VC</li>
              </ol>
            </div>
          )}

          {step === 'sign' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <p className="text-sm">Waiting for wallet signature…</p>
            </div>
          )}

          {step === 'issuing' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
              <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
              <p className="text-sm">Verifying signature & issuing credential…</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Credential issued!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your Ethereum address is now linked to {iotaName} via a Verifiable Credential.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              {step === 'done' ? 'Close' : 'Cancel'}
            </Button>
            {step !== 'done' && (
              <Button
                onClick={handleSignAndLink}
                disabled={!canSign || isLoading || !!existingEvmVc}
                className="bg-[#D4AF37] hover:bg-[#C4A030] text-black"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Sign & Link
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
