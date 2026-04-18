/**
 * ENS Registration Modal
 * Implements the commit-reveal registration flow for .eth names
 * 
 * Flow:
 * 1. User selects duration and sees price quote
 * 2. Step 1: Commit transaction (stores hash onchain)
 * 3. Step 2: Wait ~60 seconds (required by ENS protocol)
 * 4. Step 3: Register transaction (finalizes registration)
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Loader2, Check, Clock, AlertCircle, ExternalLink, Wallet } from 'lucide-react';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useNavigate } from 'react-router-dom';
import { 
  ETH_REGISTRAR_CONTROLLER, 
  ETH_REGISTRAR_CONTROLLER_ABI,
  PUBLIC_RESOLVER,
  formatPrice,
  yearsToSeconds,
  generateSecret,
  storeCommitment,
  getCommitment,
  removeCommitment,
} from '@/lib/ens';
import { getEnsRentPrice, getMinCommitmentAge, getCommitmentTimestamp } from '@/hooks/useEnsAvailability';
import ensLogoBlue from '@/assets/ens-logo-blue.png';

type RegistrationStep = 'quote' | 'committing' | 'waiting' | 'registering' | 'success' | 'error';

interface EnsRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string; // Full name like "example.eth"
  label: string; // Just the label like "example"
}

export const EnsRegisterModal = ({ open, onOpenChange, name, label }: EnsRegisterModalProps) => {
  const navigate = useNavigate();
  const { isConnected, address, chainId, openModal, openChainModal } = useWalletConnect();
  const { switchChain } = useSwitchChain();
  
  // Registration state
  const [step, setStep] = useState<RegistrationStep>('quote');
  const [years, setYears] = useState(1);
  const [price, setPrice] = useState<{ base: bigint; premium: bigint; total: bigint } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [secret, setSecret] = useState<`0x${string}` | null>(null);
  const [commitment, setCommitment] = useState<`0x${string}` | null>(null);
  const [waitEndTime, setWaitEndTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [registerTxHash, setRegisterTxHash] = useState<string | null>(null);

  // Wagmi hooks for contract writes
  const { writeContractAsync: writeCommit, isPending: isCommitting, data: commitTxHash } = useWriteContract();
  const { writeContractAsync: writeRegister, isPending: isRegistering } = useWriteContract();
  
  // Wait for commit transaction
  const { isLoading: isWaitingCommit, isSuccess: commitSuccess } = useWaitForTransactionReceipt({
    hash: commitTxHash,
  });

  // Check if on correct chain
  const isOnMainnet = chainId === mainnet.id;

  // Fetch price when years change
  useEffect(() => {
    if (!open || !label) return;
    
    const fetchPrice = async () => {
      setPriceLoading(true);
      try {
        const p = await getEnsRentPrice(label, years);
        setPrice(p);
      } catch (e) {
        console.error('Failed to fetch price:', e);
        setError('Failed to fetch price');
      } finally {
        setPriceLoading(false);
      }
    };
    
    fetchPrice();
  }, [open, label, years]);

  // Check for existing commitment on open
  useEffect(() => {
    if (!open || !address || !label) return;
    
    const existingCommitment = getCommitment(label, address);
    if (existingCommitment) {
      setSecret(existingCommitment.secret as `0x${string}`);
      setCommitment(existingCommitment.commitment as `0x${string}`);
      setYears(existingCommitment.duration);
      
      // Check if commitment is still valid onchain
      const checkCommitment = async () => {
        try {
          const timestamp = await getCommitmentTimestamp(existingCommitment.commitment as `0x${string}`);
          if (timestamp > 0) {
            const minAge = await getMinCommitmentAge();
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - timestamp;
            
            if (elapsed >= minAge) {
              // Ready to register
              setStep('waiting');
              setWaitEndTime(0); // Already past wait time
            } else {
              // Still waiting
              setStep('waiting');
              setWaitEndTime((timestamp + minAge) * 1000);
            }
          }
        } catch (e) {
          console.warn('Failed to check existing commitment:', e);
        }
      };
      
      checkCommitment();
    }
  }, [open, address, label]);

  // Countdown timer for waiting step
  useEffect(() => {
    if (step !== 'waiting' || !waitEndTime) return;
    
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((waitEndTime - Date.now()) / 1000));
      setCountdown(remaining);
      
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [step, waitEndTime]);

  // Handle commit success
  useEffect(() => {
    if (commitSuccess && step === 'committing') {
      // Start the wait period
      const fetchMinAge = async () => {
        const minAge = await getMinCommitmentAge();
        const endTime = Date.now() + (minAge * 1000) + 5000; // Add 5s buffer
        setWaitEndTime(endTime);
        setStep('waiting');
      };
      fetchMinAge();
    }
  }, [commitSuccess, step]);

  // Step 1: Commit
  const handleCommit = useCallback(async () => {
    if (!address || !price) return;
    
    setError(null);
    setStep('committing');
    
    try {
      // Generate secret if not already set
      const newSecret = secret || generateSecret();
      setSecret(newSecret);
      
      const duration = yearsToSeconds(years);
      
      // Make commitment hash via contract read
      const { encodeFunctionData, decodeFunctionResult } = await import('viem');
      
      const makeCommitmentData = encodeFunctionData({
        abi: ETH_REGISTRAR_CONTROLLER_ABI as any,
        functionName: 'makeCommitment',
        args: [
          label,
          address,
          duration,
          newSecret,
          PUBLIC_RESOLVER,
          [], // No initial records
          false, // Don't set reverse record
          0, // No fuses
        ],
      });

      const response = await fetch('https://eth.llamarpc.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: ETH_REGISTRAR_CONTROLLER, data: makeCommitmentData }, 'latest'],
        }),
      });

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const commitmentHash = decodeFunctionResult({
        abi: ETH_REGISTRAR_CONTROLLER_ABI as any,
        functionName: 'makeCommitment',
        data: json.result,
      }) as `0x${string}`;

      setCommitment(commitmentHash);
      
      // Store in localStorage for recovery
      storeCommitment({
        name: label,
        owner: address,
        secret: newSecret,
        duration: years,
        commitment: commitmentHash,
        timestamp: Date.now(),
      });
      
      // Submit commit transaction
      await writeCommit({
        address: ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_CONTROLLER_ABI as any,
        functionName: 'commit',
        args: [commitmentHash],
        chain: mainnet,
        account: address as `0x${string}`,
      });
      
    } catch (e: any) {
      console.error('Commit failed:', e);
      setError(e.shortMessage || e.message || 'Commit transaction failed');
      setStep('error');
    }
  }, [address, price, secret, years, label, writeCommit]);

  // Step 3: Register
  const handleRegister = useCallback(async () => {
    if (!address || !price || !secret) return;
    
    setError(null);
    setStep('registering');
    
    try {
      const duration = yearsToSeconds(years);
      // Add 10% buffer to price for gas fluctuations
      const value = (price.total * 110n) / 100n;
      
      const hash = await writeRegister({
        address: ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_CONTROLLER_ABI as any,
        functionName: 'register',
        args: [
          label,
          address as `0x${string}`,
          duration,
          secret,
          PUBLIC_RESOLVER,
          [], // No initial records
          false, // Don't set reverse record
          0, // No fuses
        ],
        value,
        chain: mainnet,
        account: address as `0x${string}`,
      });
      
      setRegisterTxHash(hash as string);
      
      // Clean up stored commitment
      removeCommitment(label, address);
      
      setStep('success');
      
    } catch (e: any) {
      console.error('Register failed:', e);
      
      // Handle specific errors
      if (e.message?.includes('CommitmentTooNew')) {
        setError('Please wait a bit longer before registering');
        setStep('waiting');
      } else if (e.message?.includes('CommitmentTooOld')) {
        setError('Commitment expired. Please start over.');
        removeCommitment(label, address);
        setStep('quote');
      } else if (e.message?.includes('NameNotAvailable')) {
        setError('Name was registered by someone else');
        setStep('error');
      } else {
        setError(e.shortMessage || e.message || 'Registration failed');
        setStep('error');
      }
    }
  }, [address, price, secret, years, label, writeRegister]);

  // Reset on close
  const handleClose = (open: boolean) => {
    if (!open) {
      // Don't reset if we're in the middle of registration
      if (step !== 'committing' && step !== 'waiting' && step !== 'registering') {
        setStep('quote');
        setError(null);
      }
    }
    onOpenChange(open);
  };

  // View profile after success
  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/${name}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border">
        {/* Header */}
        <div className="relative h-20 bg-gradient-to-br from-[#5298FF]/20 to-[#3370CC]/20">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute bottom-4 left-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5298FF] to-[#3370CC] flex items-center justify-center">
              <img src={ensLogoBlue} alt="ENS" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{name}</DialogTitle>
              <p className="text-sm text-muted-foreground">ENS Domain Registration</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-2 space-y-4">
          
          {/* Not connected state */}
          {!isConnected && (
            <div className="text-center py-6 space-y-4">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Connect your wallet to register this name</p>
              <Button onClick={openModal} className="bg-gradient-to-r from-[#5298FF] to-[#3370CC] text-white">
                Connect Wallet
              </Button>
            </div>
          )}

          {/* Wrong chain state */}
          {isConnected && !isOnMainnet && (
            <div className="text-center py-6 space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
              <p className="text-muted-foreground">Switch to Ethereum Mainnet to register ENS names</p>
              <Button 
                onClick={() => switchChain?.({ chainId: mainnet.id })}
                className="bg-gradient-to-r from-[#5298FF] to-[#3370CC] text-white"
              >
                Switch to Mainnet
              </Button>
            </div>
          )}

          {/* Quote Step */}
          {isConnected && isOnMainnet && step === 'quote' && (
            <>
              {/* Duration Selector */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Registration Period</span>
                  <Badge variant="secondary" className="bg-[#5298FF]/20 text-[#5298FF]">
                    {years} {years === 1 ? 'Year' : 'Years'}
                  </Badge>
                </div>
                <Slider
                  value={[years]}
                  onValueChange={([v]) => setYears(v)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 Year</span>
                  <span>10 Years</span>
                </div>
              </div>

              {/* Price Display */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration</span>
                  {priceLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : price ? (
                    <span className="font-medium">{formatPrice(price.base)}</span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                {price && price.premium > 0n && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Premium</span>
                    <span className="font-medium text-amber-500">{formatPrice(price.premium)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-medium">Total</span>
                  {priceLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : price ? (
                    <span className="font-bold text-lg">{formatPrice(price.total)}</span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
                <p className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Registration requires 2 transactions with a ~60 second wait between them.</span>
                </p>
              </div>

              {/* Register Button */}
              <Button
                onClick={handleCommit}
                disabled={!price || priceLoading}
                className="w-full bg-gradient-to-r from-[#5298FF] to-[#3370CC] text-white h-12 text-lg"
              >
                Begin Registration
              </Button>
            </>
          )}

          {/* Committing Step */}
          {isConnected && isOnMainnet && step === 'committing' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#5298FF]/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5298FF]" />
                </div>
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-muted">Step 1 of 2</Badge>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Submitting Commitment</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isCommitting ? 'Confirm in your wallet...' : isWaitingCommit ? 'Waiting for confirmation...' : 'Processing...'}
                </p>
              </div>
            </div>
          )}

          {/* Waiting Step */}
          {isConnected && isOnMainnet && step === 'waiting' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#5298FF]/20 flex items-center justify-center">
                  {countdown > 0 ? (
                    <span className="text-2xl font-bold text-[#5298FF]">{countdown}s</span>
                  ) : (
                    <Check className="w-8 h-8 text-emerald-500" />
                  )}
                </div>
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-600">
                  Step 1 Complete
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {countdown > 0 ? 'Wait Period' : 'Ready to Register!'}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {countdown > 0 
                    ? 'ENS requires a short wait to prevent front-running'
                    : 'Click below to complete your registration'}
                </p>
              </div>
              <Button
                onClick={handleRegister}
                disabled={countdown > 0}
                className="w-full bg-gradient-to-r from-[#5298FF] to-[#3370CC] text-white h-12 text-lg"
              >
                {countdown > 0 ? `Wait ${countdown}s` : 'Complete Registration'}
              </Button>
            </div>
          )}

          {/* Registering Step */}
          {isConnected && isOnMainnet && step === 'registering' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#5298FF]/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5298FF]" />
                </div>
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-muted">Step 2 of 2</Badge>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Completing Registration</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isRegistering ? 'Confirm in your wallet...' : 'Processing...'}
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {isConnected && isOnMainnet && step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Registration Complete!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  You now own <span className="font-bold">{name}</span>
                </p>
              </div>
              {registerTxHash && (
                <a
                  href={`https://etherscan.io/tx/${registerTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#5298FF] hover:underline inline-flex items-center gap-1"
                >
                  View on Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <Button onClick={handleViewProfile} className="w-full bg-gradient-to-r from-[#5298FF] to-[#3370CC] text-white">
                View Profile
              </Button>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Registration Failed</h3>
                <p className="text-muted-foreground text-sm mt-1">{error || 'An error occurred'}</p>
              </div>
              <Button onClick={() => setStep('quote')} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
