/**
 * IOTA Subdomain Mint Modal
 * Premium UI for minting vanity.iota subdomains using the IOTA Names SDK
 */

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Check, AlertCircle, Wallet, ExternalLink, 
  Globe, Link2, Sparkles, Shield, ArrowRight 
} from 'lucide-react';
import { useIotaWallet } from '@/contexts/IotaWalletContext';
import { useCurrentAccount, ConnectModal, useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useCryptoPrices } from '@/contexts/CryptoPriceContext';
import { getSubdomainPriceUsd } from '@/hooks/useIotaSubdomainAvailability';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { callEdge } from '@/lib/supaInvoke';
import { cn } from '@/lib/utils';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';

// Placeholder - needs to be updated with actual vanity.iota parent NFT object ID
const VANITY_IOTA_PARENT_NFT_ID = import.meta.env.VITE_VANITY_IOTA_PARENT_NFT_ID || '';
// Parent expiration timestamp (needs to match vanity.iota expiration)
const VANITY_IOTA_EXPIRATION_MS = import.meta.env.VITE_VANITY_IOTA_EXPIRATION_MS 
  ? parseInt(import.meta.env.VITE_VANITY_IOTA_EXPIRATION_MS, 10)
  : Date.now() + (365 * 24 * 60 * 60 * 1000 * 10); // Default: 10 years from now

// IOTA price placeholder (update when added to CryptoPriceContext)
const IOTA_USD_PRICE = 0.25;

type MintStep = 'quote' | 'minting' | 'creating_redirect' | 'success' | 'error';

interface IotaSubdomainMintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string; // The subdomain label (e.g., "guy" for guy.vanity.iota)
}

export function IotaSubdomainMintModal({ open, onOpenChange, label }: IotaSubdomainMintModalProps) {
  const navigate = useNavigate();
  const { isConnected } = useIotaWallet();
  const currentAccount = useCurrentAccount();
  const { prices } = useCryptoPrices();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  
  const [step, setStep] = useState<MintStep>('quote');
  const [error, setError] = useState<string | null>(null);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [vanityBoxUrl, setVanityBoxUrl] = useState<string | null>(null);

  const fullName = `${label}.vanity.iota`;
  const priceUsd = getSubdomainPriceUsd(label);
  
  // Convert USD to IOTA tokens
  const iotaTokenPrice = priceUsd > 0 ? (priceUsd / IOTA_USD_PRICE).toFixed(2) : '—';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('quote');
      setError(null);
      setTxDigest(null);
      setVanityBoxUrl(null);
    }
  }, [open]);

  const handleCreateVanityBoxRedirect = async (digest: string) => {
    if (!currentAccount?.address) return;

    setStep('creating_redirect');
    
    try {
      const result = await callEdge<{
        success: boolean;
        vanityBoxUrl?: string;
        error?: string;
      }>('create-vanity-box-redirect', {
        subdomain: label,
        walletAddress: currentAccount.address,
        txDigest: digest,
      });

      if (result.success && result.vanityBoxUrl) {
        setVanityBoxUrl(result.vanityBoxUrl);
        console.log('[IOTA Mint] Vanity.box redirect created:', result.vanityBoxUrl);
      }
    } catch (err: any) {
      console.error('[IOTA Mint] Failed to create vanity.box redirect:', err);
      // Don't fail the mint - redirect is a bonus feature
    }

    setStep('success');
  };

  const handleMint = useCallback(async () => {
    if (!currentAccount?.address) {
      setConnectModalOpen(true);
      return;
    }

    if (!VANITY_IOTA_PARENT_NFT_ID) {
      // Show coming soon message since parent NFT is not configured
      toast.info('IOTA subdomain minting coming soon!', {
        description: 'The vanity.iota parent name needs to be configured first.',
      });
      return;
    }

    setStep('minting');
    setError(null);

    try {
      // TODO: Implement actual minting when parent NFT is ready
      // 1. Build transaction with IotaNamesTransaction.createSubname()
      // 2. Transfer NFT to user address
      // 3. Execute with signAndExecuteTransaction()
      
      // For now, simulate the minting flow
      const mockDigest = `mock_${Date.now()}`;
      setTxDigest(mockDigest);
      
      // Create the vanity.box redirect
      await handleCreateVanityBoxRedirect(mockDigest);
      
      toast.success(`Successfully minted ${fullName}! 🎉`);
    } catch (err: any) {
      console.error('[IOTA Mint] Error:', err);
      setError(err?.message || 'Failed to mint subdomain');
      setStep('error');
      toast.error('Minting failed', { description: err?.message });
    }
  }, [currentAccount, fullName, label]);

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/${fullName}`);
  };

  const handleClose = (open: boolean) => {
    if (!open && step !== 'minting' && step !== 'creating_redirect') {
      setStep('quote');
      setError(null);
      setTxDigest(null);
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
          <div className="relative h-32 bg-gradient-to-br from-teal-500/30 via-teal-600/20 to-cyan-500/20">
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
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 p-0.5 shadow-xl shadow-teal-500/20">
                  <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center overflow-hidden">
                    <img 
                      src={vanityIotaAvatar} 
                      alt="IOTA" 
                      className="w-16 h-16 object-cover rounded-xl" 
                    />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-background">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
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
                <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-teal-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Connect IOTA Wallet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Connect your IOTA wallet to mint this subdomain
                  </p>
                </div>
                <Button 
                  onClick={() => setConnectModalOpen(true)}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-8 h-12 text-base font-semibold rounded-xl shadow-lg shadow-teal-500/20"
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect IOTA Wallet
                </Button>
              </div>
            )}

            {/* Quote Step - Connected */}
            {isIotaWalletAvailable && isConnected && step === 'quote' && (
              <>
                {/* Features Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-4 h-4 text-teal-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Onchain Identity</p>
                      <p className="text-xs text-muted-foreground">IOTA blockchain</p>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                      <Link2 className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Vanity.box URL</p>
                      <p className="text-xs text-muted-foreground">{label}.vanity.box</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Price Breakdown */}
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
                      <span className="text-2xl font-bold text-foreground">${priceUsd}</span>
                      <p className="text-xs text-muted-foreground">≈ {iotaTokenPrice} IOTA</p>
                    </div>
                  </div>
                </div>

                {/* What you get */}
                <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">What you get</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1.5 ml-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span><strong>{fullName}</strong> on IOTA blockchain</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span><strong>{label}.vanity.box</strong> redirect URL</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Customizable onchain profile</span>
                    </li>
                  </ul>
                </div>

                {/* Wallet Status */}
                <div className="flex items-center justify-between bg-muted/20 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
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
                  onClick={handleMint}
                  className={cn(
                    "w-full h-14 text-lg font-semibold rounded-xl transition-all",
                    "bg-gradient-to-r from-teal-500 to-teal-600",
                    "hover:from-teal-600 hover:to-teal-700",
                    "text-white shadow-lg shadow-teal-500/25",
                    "active:scale-[0.98]"
                  )}
                >
                  <span>Mint for ${priceUsd}</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </>
            )}

            {/* Minting Step */}
            {(step === 'minting' || step === 'creating_redirect') && (
              <div className="text-center py-10 space-y-5">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-2xl bg-teal-500/20 animate-pulse" />
                  <div className="absolute inset-2 rounded-xl bg-teal-500/30 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {step === 'minting' ? 'Minting Subdomain' : 'Creating Redirect'}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {step === 'minting' 
                      ? 'Confirm the transaction in your wallet...'
                      : 'Setting up your vanity.box redirect...'}
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

                {txDigest && (
                  <a
                    href={`https://explorer.iota.org/mainnet/tx/${txDigest}`}
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
