/**
 * IOTA Subdomain Mint Modal
 * Uses @iota/dapp-kit useSignAndExecuteTransaction for wallet-signed payments
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Check, AlertCircle, Wallet, ExternalLink, 
  Globe, Link2, ArrowRight, Copy, Percent, Shield
} from 'lucide-react';
import { useIotaWallet } from '@/contexts/IotaWalletContext';
import { ConnectModal } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { useIotaAccountSafe, useSignAndExecuteTransactionSafe, isIotaAvailable } from '@/hooks/use-iota-wallet-safe';
import { useCryptoPrices } from '@/contexts/CryptoPriceContext';
import { getSubdomainPricing } from '@/hooks/useIotaSubdomainAvailability';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { callEdge } from '@/lib/supaInvoke';
import { cn } from '@/lib/utils';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';

// Payment receiver address
const PAYMENT_RECEIVER_ADDRESS = "0x20ea2665976a7731a1ee82f8d53be43b0f411b231c1c15850b92b8fdbd4b2839";

// 1 IOTA = 1_000_000_000 nanos
const IOTA_DECIMALS = 9;

type MintStep = 'quote' | 'signing' | 'verifying' | 'minting' | 'success' | 'error';

interface IotaSubdomainMintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
}

export function IotaSubdomainMintModal({ open, onOpenChange, label }: IotaSubdomainMintModalProps) {
  const navigate = useNavigate();
  const { isConnected } = useIotaWallet();
  const currentAccount = useIotaAccountSafe();
  const { mutate: signAndExecuteTransaction, isPending: isSigning } = useSignAndExecuteTransactionSafe();
  const { prices, isLoading: pricesLoading } = useCryptoPrices();
  
  const [step, setStep] = useState<MintStep>('quote');
  const [error, setError] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [vanityBoxUrl, setVanityBoxUrl] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState<string>('0');
  const [verifiedTxHash, setVerifiedTxHash] = useState<string | null>(null);

  const fullName = `${label}.vanity.iota`;
  const pricing = getSubdomainPricing(label);
  
  // Calculate token amount based on live prices
  const calculateTokenAmount = useCallback(() => {
    if (pricing.earlyAccessPrice <= 0) return '0';
    const iotaPrice = prices.iota || 0.22;
    return (pricing.earlyAccessPrice / iotaPrice).toFixed(2);
  }, [pricing.earlyAccessPrice, prices]);

  // Update token amount when prices change
  useEffect(() => {
    setTokenAmount(calculateTokenAmount());
  }, [calculateTokenAmount]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('quote');
      setError(null);
      setPaymentReference(null);
      setVanityBoxUrl(null);
      setVerifiedTxHash(null);
    }
  }, [open]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(PAYMENT_RECEIVER_ADDRESS);
    toast.success('Address copied!');
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(tokenAmount);
    toast.success('Amount copied!');
  };

  // Build and sign IOTA transaction via wallet
  const handlePayWithWallet = useCallback(async () => {
    if (!currentAccount?.address) {
      setConnectModalOpen(true);
      return;
    }

    setError(null);

    try {
      // Step 1: Initiate payment on backend to get a reference
      const initResult = await callEdge<{
        success: boolean;
        reference?: string;
        error?: string;
      }>('initiate-iota-payment', {
        subdomain: label,
        walletAddress: currentAccount.address,
        paymentAmountUsd: pricing.earlyAccessPrice,
        paymentMethod: 'IOTA',
        tokenAmount: tokenAmount,
      });

      if (!initResult.success || !initResult.reference) {
        throw new Error(initResult.error || 'Failed to initiate payment');
      }

      const reference = initResult.reference;
      setPaymentReference(reference);
      setStep('signing');

      // Step 2: Build the IOTA transaction
      const amountInNanos = Math.ceil(parseFloat(tokenAmount) * Math.pow(10, IOTA_DECIMALS));
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [amountInNanos]);
      tx.transferObjects([coin], PAYMENT_RECEIVER_ADDRESS);

      console.log(`[IOTA Mint] Requesting wallet signature for ${tokenAmount} IOTA (${amountInNanos} nanos)`);

      // Step 3: Sign and execute via wallet
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            const digest = result.digest;
            console.log(`[IOTA Mint] Transaction signed & submitted: ${digest}`);
            setVerifiedTxHash(digest);
            setStep('verifying');
            toast.success('Transaction submitted!');

            // Step 4: Verify on backend with the digest
            try {
              const verifyResult = await callEdge<{
                success: boolean;
                verified?: boolean;
                error?: string;
              }>('verify-iota-payment', {
                reference,
                walletAddress: currentAccount.address,
                txHash: digest,
              });

              if (verifyResult.verified) {
                toast.success('Payment verified!');
                await handleMint(reference, digest);
              } else {
                throw new Error(verifyResult.error || 'Payment verification failed');
              }
            } catch (verifyErr: any) {
              console.error('[IOTA Mint] Verification error:', verifyErr);
              setError(verifyErr?.message || 'Payment verification failed');
              setStep('error');
            }
          },
          onError: (err) => {
            console.error('[IOTA Mint] Wallet signing failed:', err);
            setError(err?.message || 'Transaction was rejected or failed');
            setStep('error');
            toast.error('Transaction failed', { description: err?.message });
          },
        }
      );
    } catch (err: any) {
      console.error('[IOTA Mint] Payment error:', err);
      setError(err?.message || 'Failed to initiate payment');
      setStep('error');
      toast.error('Payment failed', { description: err?.message });
    }
  }, [currentAccount, label, pricing.earlyAccessPrice, tokenAmount, signAndExecuteTransaction]);

  const handleMint = useCallback(async (ref?: string, txHash?: string) => {
    const reference = ref || paymentReference;
    if (!currentAccount?.address || !reference) return;

    setStep('minting');

    try {
      const result = await callEdge<{
        success: boolean;
        vanityBoxUrl?: string;
        profileUrl?: string;
        error?: string;
      }>('mint-iota-subdomain', {
        reference: reference,
        walletAddress: currentAccount.address,
      });

      if (!result.success) {
        throw new Error(result.error || 'Minting failed');
      }

      if (result.vanityBoxUrl) {
        setVanityBoxUrl(result.vanityBoxUrl);
      }

      setStep('success');
      toast.success(`Successfully minted ${fullName}! 🎉`);
    } catch (err: any) {
      console.error('[IOTA Mint] Minting error:', err);
      setError(err?.message || 'Minting failed');
      setStep('error');
      toast.error('Minting failed', { description: err?.message });
    }
  }, [currentAccount, paymentReference, fullName]);

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/${fullName}`);
  };

  const handleClose = (open: boolean) => {
    if (!open && step !== 'minting' && step !== 'signing' && step !== 'verifying') {
      setStep('quote');
      setError(null);
      setPaymentReference(null);
      setVanityBoxUrl(null);
    }
    onOpenChange(open);
  };

  const isIotaWalletAvailable = isIotaAvailable;

  const getPriceBreakdown = () => {
    const len = label.length;
    return `${len} character${len !== 1 ? 's' : ''}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border rounded-2xl">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-[#D4AF37]/20 via-[#D4AF37]/10 to-transparent p-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8960A] p-0.5 shadow-lg shadow-[#D4AF37]/20">
                  <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center overflow-hidden">
                    <img src={vanityIotaAvatar} alt="IOTA" className="w-12 h-12 object-cover rounded-xl" />
                  </div>
                </div>
                <Badge className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-[8px] px-1 py-0 shadow-lg">
                  <Percent className="w-2 h-2 mr-0.5" />50% OFF
                </Badge>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
                <p className="text-sm text-muted-foreground">IOTA Names Subdomain</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            
            {/* Not available on mobile */}
            {!isIotaWalletAvailable && (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Desktop Required</h3>
                  <p className="text-muted-foreground text-sm">IOTA wallet connection requires a desktop browser.</p>
                </div>
              </div>
            )}

            {/* Not connected state */}
            {isIotaWalletAvailable && !isConnected && step === 'quote' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-semibold">Connect IOTA Wallet</h3>
                  <p className="text-muted-foreground text-sm">Connect your wallet to mint this subdomain</p>
                </div>
                <Button 
                  onClick={() => setConnectModalOpen(true)}
                  className="bg-[#D4AF37] hover:bg-[#C9A030] text-black px-6 h-11 font-semibold rounded-xl"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            )}

            {/* Quote Step - Connected */}
            {isIotaWalletAvailable && isConnected && step === 'quote' && (
              <>
                {/* Features */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs">Onchain Identity</span>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs">{label}.vanity.box</span>
                  </div>
                </div>

                {/* Price */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{getPriceBreakdown()}</span>
                    <span className="text-muted-foreground line-through">${pricing.originalPrice}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-[#D4AF37]">${pricing.earlyAccessPrice}</span>
                      <p className="text-xs text-muted-foreground">≈ {pricesLoading ? '...' : tokenAmount} IOTA</p>
                    </div>
                  </div>
                </div>

                {/* Wallet */}
                <div className="flex items-center justify-between text-sm bg-muted/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="text-muted-foreground">Wallet</span>
                  </div>
                  <span className="font-mono text-xs">
                    {currentAccount?.address?.slice(0, 6)}...{currentAccount?.address?.slice(-4)}
                  </span>
                </div>

                {/* Mint Button */}
                <Button
                  onClick={handlePayWithWallet}
                  className="w-full h-12 text-base font-semibold rounded-xl bg-[#D4AF37] hover:bg-[#C9A030] text-black shadow-lg shadow-[#D4AF37]/20"
                >
                  Mint for ${pricing.earlyAccessPrice}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}

            {/* Signing Step - Waiting for wallet approval */}
            {step === 'signing' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-semibold">Approve in Wallet</h3>
                  <p className="text-muted-foreground text-sm">
                    Confirm the transaction of <strong>{tokenAmount} IOTA</strong> in your wallet
                  </p>
                </div>
              </div>
            )}

            {/* Verifying Step - Transaction submitted, verifying on backend */}
            {step === 'verifying' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-semibold">Verifying Payment</h3>
                  <p className="text-muted-foreground text-sm">Transaction submitted, confirming on-chain...</p>
                </div>
                {verifiedTxHash && (
                  <a
                    href={`https://explorer.iota.org/mainnet/tx/${verifiedTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Minting Step */}
            {step === 'minting' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-semibold">Minting Subdomain</h3>
                  <p className="text-muted-foreground text-sm">Creating your identity and DNS redirect...</p>
                </div>
              </div>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">🎉 Success!</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    <strong>{fullName}</strong> is now yours
                  </p>
                </div>

                {/* URLs */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-left">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profile</span>
                    <span className="font-medium">vanity.box/{fullName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Redirect</span>
                    <span className="font-medium">{label}.vanity.box</span>
                  </div>
                </div>

                {verifiedTxHash && (
                  <a
                    href={`https://explorer.iota.org/mainnet/tx/${verifiedTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    View Transaction <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => handleClose(false)} className="flex-1 h-11 rounded-xl">
                    Close
                  </Button>
                  <Button onClick={handleViewProfile} className="flex-1 h-11 rounded-xl bg-[#D4AF37] hover:bg-[#C9A030] text-black">
                    View Profile
                  </Button>
                </div>
              </div>
            )}

            {/* Error Step */}
            {step === 'error' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Payment Failed</h3>
                  <p className="text-muted-foreground text-sm">{error || 'An error occurred'}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => handleClose(false)} className="flex-1 h-11 rounded-xl">
                    Close
                  </Button>
                  <Button onClick={() => setStep('quote')} className="flex-1 h-11 rounded-xl bg-[#D4AF37] hover:bg-[#C9A030] text-black">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* IOTA Wallet Connect Modal */}
      {isIotaWalletAvailable && (
        <ConnectModal
          trigger={<></>}
          open={connectModalOpen}
          onOpenChange={setConnectModalOpen}
        />
      )}
    </>
  );
}
