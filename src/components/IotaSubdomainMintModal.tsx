/**
 * IOTA Subdomain Mint Modal
 * Allows users to mint vanity.iota subdomains using the IOTA Names SDK
 */

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle, Wallet, ExternalLink } from 'lucide-react';
import { useIotaWallet } from '@/contexts/IotaWalletContext';
import { useCurrentAccount, ConnectModal } from '@iota/dapp-kit';
import { useCryptoPrices } from '@/contexts/CryptoPriceContext';
import { getSubdomainPriceUsd } from '@/hooks/useIotaSubdomainAvailability';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';

// Placeholder - needs to be updated with actual vanity.iota parent NFT object ID
const VANITY_IOTA_PARENT_NFT_ID = import.meta.env.VITE_VANITY_IOTA_PARENT_NFT_ID || '';
// Parent expiration timestamp (needs to match vanity.iota expiration)
const VANITY_IOTA_EXPIRATION_MS = import.meta.env.VITE_VANITY_IOTA_EXPIRATION_MS 
  ? parseInt(import.meta.env.VITE_VANITY_IOTA_EXPIRATION_MS, 10)
  : Date.now() + (365 * 24 * 60 * 60 * 1000 * 10); // Default: 10 years from now

type MintStep = 'quote' | 'minting' | 'success' | 'error';

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
  
  const [step, setStep] = useState<MintStep>('quote');
  const [error, setError] = useState<string | null>(null);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const fullName = `${label}.vanity.iota`;
  const priceUsd = getSubdomainPriceUsd(label);
  
  // Convert USD to IOTA (placeholder - IOTA price not in crypto context yet)
  // For now, we'll show a placeholder conversion
  const iotaPrice = prices.eth > 0 ? (priceUsd / 0.25).toFixed(2) : '—'; // Assuming ~$0.25 per IOTA

  const handleMint = useCallback(async () => {
    if (!currentAccount?.address) {
      setConnectModalOpen(true);
      return;
    }

    if (!VANITY_IOTA_PARENT_NFT_ID) {
      setError('Subdomain minting is not yet configured. Please check back later.');
      setStep('error');
      return;
    }

    // For now, show that the feature is coming soon since parent NFT is not configured
    toast.info('IOTA subdomain minting coming soon!', {
      description: 'The vanity.iota parent name needs to be configured first.',
    });
    
    // TODO: When parent NFT is ready, implement the minting flow:
    // 1. Build transaction with IotaNamesTransaction.createSubname()
    // 2. Transfer NFT to user address
    // 3. Execute with signAndExecuteTransaction()
  }, [currentAccount, fullName]);

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/${fullName}`);
  };

  const handleClose = (open: boolean) => {
    if (!open && step !== 'minting') {
      setStep('quote');
      setError(null);
      setTxDigest(null);
    }
    onOpenChange(open);
  };

  // Check if IOTA wallet integration is available (not on mobile)
  const isIotaWalletAvailable = typeof window !== 'undefined' && 
    !/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border">
          {/* Header */}
          <div className="relative h-20 bg-gradient-to-br from-teal-500/20 to-teal-600/20">
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-4 left-6 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center overflow-hidden">
                <img src={vanityIotaAvatar} alt="IOTA" className="w-10 h-10 object-cover rounded-lg" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">{fullName}</DialogTitle>
                <p className="text-sm text-muted-foreground">IOTA Subdomain</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 pt-2 space-y-4">
            
            {/* Not available on mobile */}
            {!isIotaWalletAvailable && (
              <div className="text-center py-6 space-y-4">
                <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
                <p className="text-muted-foreground">
                  IOTA wallet connection is only available on desktop browsers.
                </p>
              </div>
            )}

            {/* Not connected state */}
            {isIotaWalletAvailable && !isConnected && step === 'quote' && (
              <div className="text-center py-6 space-y-4">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Connect your IOTA wallet to mint this subdomain</p>
                <Button 
                  onClick={() => setConnectModalOpen(true)}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 text-white"
                >
                  Connect IOTA Wallet
                </Button>
              </div>
            )}

            {/* Quote Step */}
            {isIotaWalletAvailable && isConnected && step === 'quote' && (
              <>
                {/* Price Display */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subdomain</span>
                    <span className="font-medium">{fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Character Length</span>
                    <span className="font-medium">{label.length} characters</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-medium">Price</span>
                    <div className="text-right">
                      <span className="font-bold text-lg">${priceUsd}</span>
                      <p className="text-xs text-muted-foreground">≈ {iotaPrice} IOTA</p>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3 text-sm text-teal-700 dark:text-teal-300">
                  <p>
                    This subdomain will be minted as an NFT on the IOTA blockchain and transferred to your connected wallet.
                  </p>
                </div>

                {/* Mint Button */}
                <Button
                  onClick={handleMint}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white h-12 text-lg"
                >
                  Mint Subdomain
                </Button>
              </>
            )}

            {/* Minting Step */}
            {step === 'minting' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Minting Subdomain</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Confirm the transaction in your wallet...
                  </p>
                </div>
              </div>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Subdomain Minted!</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {fullName} has been minted to your wallet.
                  </p>
                </div>
                {txDigest && (
                  <a
                    href={`https://explorer.iota.org/mainnet/tx/${txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-teal-500 hover:underline"
                  >
                    View Transaction <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => handleClose(false)}>
                    Close
                  </Button>
                  <Button 
                    onClick={handleViewProfile}
                    className="bg-gradient-to-r from-teal-500 to-teal-600 text-white"
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            )}

            {/* Error Step */}
            {step === 'error' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Minting Failed</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {error || 'An error occurred during minting.'}
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => handleClose(false)}>
                    Close
                  </Button>
                  <Button 
                    onClick={() => setStep('quote')}
                    className="bg-gradient-to-r from-teal-500 to-teal-600 text-white"
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
