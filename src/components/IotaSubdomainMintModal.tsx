/**
 * IOTA Subdomain Mint Modal
 * Premium UI for minting vanity.iota subdomains with payment verification
 */

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Check, AlertCircle, Wallet, ExternalLink, 
  Globe, Link2, Sparkles, Shield, ArrowRight, Copy, Clock, Percent
} from 'lucide-react';
import { useIotaWallet } from '@/contexts/IotaWalletContext';
import { useCurrentAccount, ConnectModal } from '@iota/dapp-kit';
import { useCryptoPrices } from '@/contexts/CryptoPriceContext';
import { getSubdomainPricing } from '@/hooks/useIotaSubdomainAvailability';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { callEdge } from '@/lib/supaInvoke';
import { cn } from '@/lib/utils';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';

// Payment receiver address
const PAYMENT_RECEIVER_ADDRESS = "0x20ea2665976a7731a1ee82f8d53be43b0f411b231c1c15850b92b8fdbd4b2839";

type MintStep = 'quote' | 'awaiting_payment' | 'verifying_payment' | 'minting' | 'success' | 'error';
type PaymentMethod = 'IOTA' | 'ETH';

interface IotaSubdomainMintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
}

export function IotaSubdomainMintModal({ open, onOpenChange, label }: IotaSubdomainMintModalProps) {
  const navigate = useNavigate();
  const { isConnected } = useIotaWallet();
  const currentAccount = useCurrentAccount();
  const { prices, isLoading: pricesLoading } = useCryptoPrices();
  
  const [step, setStep] = useState<MintStep>('quote');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('IOTA');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [vanityBoxUrl, setVanityBoxUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tokenAmount, setTokenAmount] = useState<string>('0');

  const fullName = `${label}.vanity.iota`;
  const pricing = getSubdomainPricing(label);
  
  // Calculate token amount based on payment method and live prices
  const calculateTokenAmount = useCallback(() => {
    if (pricing.earlyAccessPrice <= 0) return '0';
    
    if (paymentMethod === 'IOTA') {
      const iotaPrice = prices.iota || 0.22;
      return (pricing.earlyAccessPrice / iotaPrice).toFixed(2);
    } else {
      const ethPrice = prices.eth || 2600;
      return (pricing.earlyAccessPrice / ethPrice).toFixed(6);
    }
  }, [pricing.earlyAccessPrice, paymentMethod, prices]);

  // Update token amount when prices or method change
  useEffect(() => {
    setTokenAmount(calculateTokenAmount());
  }, [calculateTokenAmount]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('quote');
      setError(null);
      setTxHash('');
      setPaymentReference(null);
      setVanityBoxUrl(null);
      setIsVerifying(false);
    }
  }, [open]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(PAYMENT_RECEIVER_ADDRESS);
    toast.success('Payment address copied!');
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(tokenAmount);
    toast.success('Amount copied!');
  };

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
      
      console.log('[IOTA Mint] Payment initiated:', result.reference);
    } catch (err: any) {
      console.error('[IOTA Mint] Payment initiation error:', err);
      setError(err?.message || 'Failed to initiate payment');
      toast.error('Failed to initiate payment', { description: err?.message });
    }
  }, [currentAccount, label, pricing.earlyAccessPrice, paymentMethod, tokenAmount]);

  const handleVerifyPayment = useCallback(async () => {
    if (!txHash.trim() || !paymentReference || !currentAccount?.address) {
      toast.error('Please enter a valid transaction hash');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await callEdge<{
        success: boolean;
        verified?: boolean;
        error?: string;
        subdomain?: string;
      }>('verify-iota-payment', {
        txHash: txHash.trim(),
        reference: paymentReference,
        walletAddress: currentAccount.address,
      });

      if (!result.success || !result.verified) {
        throw new Error(result.error || 'Payment verification failed');
      }

      console.log('[IOTA Mint] Payment verified');
      setStep('minting');
      
      // Proceed to mint
      await handleMint();
    } catch (err: any) {
      console.error('[IOTA Mint] Verification error:', err);
      setError(err?.message || 'Payment verification failed');
      toast.error('Verification failed', { description: err?.message });
    } finally {
      setIsVerifying(false);
    }
  }, [txHash, paymentReference, currentAccount]);

  const handleMint = useCallback(async () => {
    if (!currentAccount?.address || !paymentReference) return;

    try {
      const result = await callEdge<{
        success: boolean;
        vanityBoxUrl?: string;
        profileUrl?: string;
        error?: string;
      }>('mint-iota-subdomain', {
        reference: paymentReference,
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
    if (!open && step !== 'minting' && step !== 'verifying_payment') {
      setStep('quote');
      setError(null);
      setTxHash('');
      setPaymentReference(null);
      setVanityBoxUrl(null);
    }
    onOpenChange(open);
  };

  // Check if IOTA wallet integration is available (not on mobile)
  const isIotaWalletAvailable = typeof window !== 'undefined' && 
    !/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Get price breakdown text
  const getPriceBreakdown = () => {
    const len = label.length;
    if (len === 3) return '3 characters';
    if (len === 4) return '4 characters';
    if (len === 5) return '5 characters';
    if (len >= 6 && len <= 9) return `${len} characters`;
    return `${len} characters`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border rounded-2xl">
          {/* Premium Header with Gradient */}
          <div className="relative h-32 bg-gradient-to-br from-[#D4AF37]/30 via-[#C9A030]/20 to-[#B8960A]/20">
            {/* Pattern overlay */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
            />
            {/* Gradient fade to content */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            {/* Avatar and Name */}
            <div className="absolute bottom-4 left-6 flex items-end gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8960A] p-0.5 shadow-xl shadow-[#D4AF37]/20">
                  <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center overflow-hidden">
                    <img 
                      src={vanityIotaAvatar} 
                      alt="IOTA" 
                      className="w-16 h-16 object-cover rounded-xl" 
                    />
                  </div>
                </div>
                {/* Early Access Badge */}
                <Badge className="absolute -top-2 -right-2 bg-[#D4AF37] text-black text-[9px] px-1.5 py-0.5 shadow-lg">
                  <Percent className="w-2.5 h-2.5 mr-0.5" />
                  50% OFF
                </Badge>
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-foreground tracking-tight">{fullName}</h2>
                <p className="text-sm text-muted-foreground">IOTA Names Subdomain</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 pt-2 space-y-5">
            
            {/* Not available on mobile */}
            {!isIotaWalletAvailable && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Desktop Required</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    IOTA wallet connection is only available on desktop browsers.
                  </p>
                </div>
              </div>
            )}

            {/* Not connected state */}
            {isIotaWalletAvailable && !isConnected && step === 'quote' && (
              <div className="text-center py-8 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Connect IOTA Wallet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Connect your IOTA wallet to mint this subdomain
                  </p>
                </div>
                <Button 
                  onClick={() => setConnectModalOpen(true)}
                  className="bg-[#D4AF37] hover:bg-[#C9A030] text-black px-8 h-12 text-base font-semibold rounded-xl shadow-lg shadow-[#D4AF37]/20"
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect IOTA Wallet
                </Button>
              </div>
            )}

            {/* Quote Step - Connected */}
            {isIotaWalletAvailable && isConnected && step === 'quote' && (
              <>
                {/* Early Access Banner */}
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#D4AF37]">Early Access - 50% Off!</p>
                    <p className="text-xs text-muted-foreground">Limited time pricing for early adopters</p>
                  </div>
                </div>

                {/* Features Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Onchain Identity</p>
                      <p className="text-xs text-muted-foreground">IOTA blockchain</p>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                      <Link2 className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Vanity.box URL</p>
                      <p className="text-xs text-muted-foreground">{label}.vanity.box</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Price Breakdown with Early Access */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subdomain</span>
                    <span className="font-medium text-foreground">{fullName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Length</span>
                    <span className="font-medium text-foreground">{getPriceBreakdown()}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total</span>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-lg line-through text-muted-foreground">${pricing.originalPrice}</span>
                        <span className="text-2xl font-bold text-[#D4AF37]">${pricing.earlyAccessPrice}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pricesLoading ? '...' : `≈ ${tokenAmount} ${paymentMethod}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="flex gap-2">
                  <Button
                    variant={paymentMethod === 'IOTA' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod('IOTA')}
                    className={cn(
                      "flex-1",
                      paymentMethod === 'IOTA' && "bg-[#D4AF37] hover:bg-[#C9A030] text-black"
                    )}
                  >
                    Pay with IOTA
                  </Button>
                  <Button
                    variant={paymentMethod === 'ETH' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod('ETH')}
                    className={cn(
                      "flex-1",
                      paymentMethod === 'ETH' && "bg-[#D4AF37] hover:bg-[#C9A030] text-black"
                    )}
                  >
                    Pay with ETH
                  </Button>
                </div>

                {/* Wallet Status */}
                <div className="flex items-center justify-between bg-muted/20 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-sm text-muted-foreground">Connected Wallet</span>
                  </div>
                  <span className="text-sm font-mono text-foreground">
                    {currentAccount?.address 
                      ? `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`
                      : '—'
                    }
                  </span>
                </div>

                {/* Mint Button */}
                <Button
                  onClick={handleInitiatePayment}
                  className={cn(
                    "w-full h-14 text-lg font-semibold rounded-xl transition-all",
                    "bg-[#D4AF37] hover:bg-[#C9A030]",
                    "text-black shadow-lg shadow-[#D4AF37]/25",
                    "active:scale-[0.98]"
                  )}
                >
                  <span>Mint for ${pricing.earlyAccessPrice}</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </>
            )}

            {/* Awaiting Payment Step */}
            {step === 'awaiting_payment' && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-[#D4AF37]" />
                  </div>
                  <h3 className="font-semibold text-lg">Send Payment</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Send exactly <strong>{tokenAmount} {paymentMethod}</strong> to the address below
                  </p>
                </div>

                {/* Payment Details */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                  {/* Amount */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <div className="flex items-center justify-between bg-background rounded-lg p-3 border border-border">
                      <span className="font-mono text-lg font-semibold">{tokenAmount} {paymentMethod}</span>
                      <Button size="sm" variant="ghost" onClick={handleCopyAmount}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">(${pricing.earlyAccessPrice} USD)</p>
                  </div>

                  {/* Address */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Send to Address</p>
                    <div className="flex items-center justify-between bg-background rounded-lg p-3 border border-border">
                      <span className="font-mono text-xs break-all">{PAYMENT_RECEIVER_ADDRESS}</span>
                      <Button size="sm" variant="ghost" onClick={handleCopyAddress} className="flex-shrink-0 ml-2">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Reference */}
                  {paymentReference && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reference</p>
                      <div className="bg-background rounded-lg p-3 border border-border">
                        <span className="font-mono text-sm">{paymentReference}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transaction Hash Input */}
                <div>
                  <p className="text-sm font-medium mb-2">After sending, paste your transaction hash:</p>
                  <Input
                    placeholder="0x..."
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg p-3 text-sm">
                    {error}
                  </div>
                )}

                {/* Verify Button */}
                <Button
                  onClick={handleVerifyPayment}
                  disabled={!txHash.trim() || isVerifying}
                  className={cn(
                    "w-full h-12 font-semibold rounded-xl",
                    "bg-[#D4AF37] hover:bg-[#C9A030] text-black"
                  )}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Verify Payment & Mint
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setStep('quote')}
                  className="w-full"
                >
                  Go Back
                </Button>
              </div>
            )}

            {/* Verifying/Minting Step */}
            {(step === 'verifying_payment' || step === 'minting') && (
              <div className="text-center py-10 space-y-5">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-2xl bg-[#D4AF37]/20 animate-pulse" />
                  <div className="absolute inset-2 rounded-xl bg-[#D4AF37]/30 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {step === 'verifying_payment' ? 'Verifying Payment' : 'Minting Subdomain'}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {step === 'verifying_payment' 
                      ? 'Checking your transaction on the blockchain...'
                      : 'Creating your subdomain and DNS redirect...'}
                  </p>
                </div>
              </div>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <div className="text-center py-8 space-y-5">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl">🎉 Subdomain Minted!</h3>
                  <p className="text-muted-foreground text-sm mt-2">
                    <strong>{fullName}</strong> has been minted to your wallet.
                  </p>
                </div>

                {/* URLs */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">IOTA Profile</span>
                    <a 
                      href={`https://vanity.box/${fullName}`}
                      className="text-sm font-medium text-teal-500 hover:underline flex items-center gap-1"
                    >
                      vanity.box/{fullName}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {vanityBoxUrl && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Redirect URL</span>
                      <a 
                        href={vanityBoxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-cyan-500 hover:underline flex items-center gap-1"
                      >
                        {label}.vanity.box
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {txHash && (
                  <a
                    href={`https://explorer.iota.org/mainnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View Transaction <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleClose(false)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={handleViewProfile}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            )}

            {/* Error Step */}
            {step === 'error' && (
              <div className="text-center py-8 space-y-5">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Minting Failed</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {error || 'An error occurred during minting.'}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleClose(false)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={() => setStep('quote')}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* IOTA Wallet Connect Modal */}
      <ConnectModal
        trigger={<></>}
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
      />
    </>
  );
}
