/**
 * IOTA Subdomain Mint Modal
 * Clean UI for minting vanity.iota subdomains with automated payment verification
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Check, AlertCircle, Wallet, ExternalLink, 
  Globe, Link2, Sparkles, Shield, ArrowRight, Copy, Percent
} from 'lucide-react';
import { useIotaWallet } from '@/contexts/IotaWalletContext';
import { ConnectModal } from '@iota/dapp-kit';
import { useIotaAccountSafe, isIotaAvailable } from '@/hooks/use-iota-wallet-safe';
import { useCryptoPrices } from '@/contexts/CryptoPriceContext';
import { getSubdomainPricing } from '@/hooks/useIotaSubdomainAvailability';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { callEdge } from '@/lib/supaInvoke';
import { cn } from '@/lib/utils';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';

// Payment receiver address
const PAYMENT_RECEIVER_ADDRESS = "0x20ea2665976a7731a1ee82f8d53be43b0f411b231c1c15850b92b8fdbd4b2839";

type MintStep = 'quote' | 'awaiting_payment' | 'minting' | 'success' | 'error';
type PaymentMethod = 'IOTA';

interface IotaSubdomainMintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
}

export function IotaSubdomainMintModal({ open, onOpenChange, label }: IotaSubdomainMintModalProps) {
  const navigate = useNavigate();
  const { isConnected } = useIotaWallet();
  const currentAccount = useIotaAccountSafe();
  const { prices, isLoading: pricesLoading } = useCryptoPrices();
  
  const [step, setStep] = useState<MintStep>('quote');
  const [error, setError] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentMethod] = useState<PaymentMethod>('IOTA');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [vanityBoxUrl, setVanityBoxUrl] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState<string>('0');
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'found'>('idle');
  const [verifiedTxHash, setVerifiedTxHash] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

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
      setPollingStatus('idle');
      setVerifiedTxHash(null);
      pollCountRef.current = 0;
    } else {
      // Clear polling when modal closes
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [open]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(PAYMENT_RECEIVER_ADDRESS);
    toast.success('Address copied!');
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(tokenAmount);
    toast.success('Amount copied!');
  };

  // Poll for payment automatically
  const startPaymentPolling = useCallback(async (ref: string) => {
    if (!currentAccount?.address) return;

    setPollingStatus('polling');
    pollCountRef.current = 0;

    // Poll every 5 seconds for up to 10 minutes
    pollingRef.current = setInterval(async () => {
      pollCountRef.current++;
      
      // Stop after 120 attempts (10 minutes)
      if (pollCountRef.current > 120) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setPollingStatus('idle');
        toast.error('Payment verification timed out. Please try again.');
        return;
      }

      try {
        const result = await callEdge<{
          success: boolean;
          verified?: boolean;
          txHash?: string;
          error?: string;
        }>('verify-iota-payment', {
          reference: ref,
          walletAddress: currentAccount.address,
          pollForPayment: true,
        });

        if (result.verified && result.txHash) {
          // Payment found!
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPollingStatus('found');
          setVerifiedTxHash(result.txHash);
          toast.success('Payment detected!');
          
          // Proceed to mint
          await handleMint(ref, result.txHash);
        }
      } catch (err) {
        console.log('[Polling] Check failed, will retry...', err);
      }
    }, 5000);
  }, [currentAccount]);

  const handleInitiatePayment = useCallback(async () => {
    if (!currentAccount?.address) {
      setConnectModalOpen(true);
      return;
    }

    setError(null);

    try {
      const result = await callEdge<{
        success: boolean;
        reference?: string;
        paymentAddress?: string;
        tokenAmount?: string;
        error?: string;
      }>('initiate-iota-payment', {
        subdomain: label,
        walletAddress: currentAccount.address,
        paymentAmountUsd: pricing.earlyAccessPrice,
        paymentMethod: paymentMethod,
        tokenAmount: tokenAmount,
      });

      if (!result.success || !result.reference) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      setPaymentReference(result.reference);
      setStep('awaiting_payment');
      
      // Start automatic polling
      startPaymentPolling(result.reference);
      
      console.log('[IOTA Mint] Payment initiated:', result.reference);
    } catch (err: any) {
      console.error('[IOTA Mint] Payment initiation error:', err);
      setError(err?.message || 'Failed to initiate payment');
      toast.error('Failed to initiate payment', { description: err?.message });
    }
  }, [currentAccount, label, pricing.earlyAccessPrice, paymentMethod, tokenAmount, startPaymentPolling]);

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
    if (!open && step !== 'minting') {
      // Clear polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setStep('quote');
      setError(null);
      setPaymentReference(null);
      setVanityBoxUrl(null);
      setPollingStatus('idle');
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
                  onClick={handleInitiatePayment}
                  className="w-full h-12 text-base font-semibold rounded-xl bg-[#D4AF37] hover:bg-[#C9A030] text-black shadow-lg shadow-[#D4AF37]/20"
                >
                  Mint for ${pricing.earlyAccessPrice}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}

            {/* Awaiting Payment Step */}
            {step === 'awaiting_payment' && (
              <div className="space-y-4">
                {/* Status indicator */}
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                    {pollingStatus === 'polling' ? (
                      <Loader2 className="w-7 h-7 text-[#D4AF37] animate-spin" />
                    ) : pollingStatus === 'found' ? (
                      <Check className="w-7 h-7 text-emerald-500" />
                    ) : (
                      <Wallet className="w-7 h-7 text-[#D4AF37]" />
                    )}
                  </div>
                  <h3 className="font-semibold">
                    {pollingStatus === 'found' ? 'Payment Detected!' : 'Send Payment'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pollingStatus === 'found' 
                      ? 'Processing your mint...' 
                      : 'Send the exact amount below'}
                  </p>
                </div>

                {pollingStatus !== 'found' && (
                  <>
                    {/* Amount */}
                    <div className="bg-muted/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">Amount</span>
                        <Button size="sm" variant="ghost" onClick={handleCopyAmount} className="h-7 px-2">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="text-center">
                        <span className="text-2xl font-bold font-mono">{tokenAmount}</span>
                        <span className="text-lg ml-2 text-muted-foreground">IOTA</span>
                      </div>
                      <p className="text-center text-xs text-muted-foreground mt-1">(${pricing.earlyAccessPrice} USD)</p>
                    </div>

                    {/* Address */}
                    <div className="bg-muted/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Send to</span>
                        <Button size="sm" variant="ghost" onClick={handleCopyAddress} className="h-7 px-2">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="font-mono text-xs break-all text-foreground">{PAYMENT_RECEIVER_ADDRESS}</p>
                    </div>

                    {/* Auto-detection notice */}
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Waiting for payment...</span>
                    </div>
                  </>
                )}

                {error && (
                  <div className="bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg p-3 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  variant="ghost"
                  onClick={() => {
                    if (pollingRef.current) {
                      clearInterval(pollingRef.current);
                      pollingRef.current = null;
                    }
                    setStep('quote');
                    setPollingStatus('idle');
                  }}
                  className="w-full"
                  disabled={pollingStatus === 'found'}
                >
                  Cancel
                </Button>
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
                  <h3 className="font-semibold">Minting Failed</h3>
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
