/**
 * BasenameRegisterModal
 * In-app registration modal for Basenames (.base.eth) on Base mainnet
 * Single transaction flow (no commit-reveal needed)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertCircle, ExternalLink, Wallet } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, usePublicClient } from 'wagmi';
import { base } from 'viem/chains';
import { encodeFunctionData, namehash, Address } from 'viem';
import { 
  BASENAMES_REGISTRAR_CONTROLLER, 
  BASENAMES_L2_RESOLVER,
  useBasenameAvailability 
} from '@/hooks/useBasenameAvailability';

interface BasenameRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  label: string | null;
}

// ABI for the register function
const REGISTER_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'duration', type: 'uint256' },
          { name: 'resolver', type: 'address' },
          { name: 'data', type: 'bytes[]' },
          { name: 'reverseRecord', type: 'bool' },
        ],
      },
    ],
    outputs: [],
  },
] as const;

// Resolver ABI for setAddr
const RESOLVER_ABI = [
  {
    name: 'setAddr',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'a', type: 'address' },
    ],
    outputs: [],
  },
] as const;

const ONE_YEAR_SECONDS = 31557600n;

export function BasenameRegisterModal({ 
  open, 
  onOpenChange, 
  name, 
  label 
}: BasenameRegisterModalProps) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  
  const [years, setYears] = useState(1);
  const [step, setStep] = useState<'quote' | 'registering' | 'success' | 'error'>('quote');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Get current price
  const { price, priceFormatted, status: availabilityStatus } = useBasenameAvailability(label || '');

  // Calculate total price based on years
  const totalPrice = useMemo(() => {
    if (!price) return null;
    return price * BigInt(years);
  }, [price, years]);

  const totalPriceFormatted = useMemo(() => {
    if (!totalPrice) return null;
    return (Number(totalPrice) / 1e18).toFixed(6);
  }, [totalPrice]);

  // Write contract hook
  const { 
    writeContract, 
    data: txHash, 
    isPending: isWritePending, 
    error: writeError,
    reset: resetWrite 
  } = useWriteContract();

  // Wait for transaction
  const { 
    isLoading: isTxPending, 
    isSuccess: isTxSuccess, 
    error: txError 
  } = useWaitForTransactionReceipt({ hash: txHash });

  // Handle transaction states
  useEffect(() => {
    if (isTxSuccess) {
      setStep('success');
    }
  }, [isTxSuccess]);

  useEffect(() => {
    if (writeError || txError) {
      setStep('error');
      setErrorMsg(writeError?.message || txError?.message || 'Transaction failed');
    }
  }, [writeError, txError]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('quote');
        setYears(1);
        setErrorMsg(null);
        resetWrite();
      }, 300);
    }
  }, [open, resetWrite]);

  const handleRegister = async () => {
    if (!address || !label || !totalPrice) return;

    try {
      // Ensure we're on Base
      if (chainId !== base.id) {
        await switchChainAsync({ chainId: base.id });
      }

      setStep('registering');
      setErrorMsg(null);

      // Build the setAddr data for the resolver
      const node = namehash(name);
      const setAddrData = encodeFunctionData({
        abi: RESOLVER_ABI,
        functionName: 'setAddr',
        args: [node, address],
      });

      // Build register request
      const registerRequest = {
        name: label,
        owner: address,
        duration: ONE_YEAR_SECONDS * BigInt(years),
        resolver: BASENAMES_L2_RESOLVER as Address,
        data: [setAddrData],
        reverseRecord: true,
      };

      // Submit registration transaction
      writeContract({
        address: BASENAMES_REGISTRAR_CONTROLLER,
        abi: REGISTER_ABI as any,
        functionName: 'register',
        args: [registerRequest],
        value: totalPrice,
        chainId: base.id,
        account: address,
        chain: base,
      } as any);
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err.message || 'Failed to submit transaction');
    }
  };

  const isOnBase = chainId === base.id;
  const needsChainSwitch = isConnected && !isOnBase;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <img 
              src="https://cdn.brandfetch.io/id6XsSOVVS/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1757929784005" 
              alt="Base" 
              className="w-8 h-8 rounded-lg"
            />
            Register {name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'quote' && (
            <>
              {/* Duration selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Registration Duration</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5].map((y) => (
                    <Button
                      key={y}
                      variant={years === y ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setYears(y)}
                      className={years === y ? 'bg-[#0052FF] hover:bg-[#0040CC]' : ''}
                    >
                      {y} {y === 1 ? 'Year' : 'Years'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Price display */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per year</span>
                  <span className="font-medium">{priceFormatted || '...'} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{years} {years === 1 ? 'year' : 'years'}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">{totalPriceFormatted || '...'} ETH</span>
                </div>
              </div>

              {/* Network badge */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-[#0052FF]/10 text-[#0052FF] border-[#0052FF]/30">
                  Base Mainnet
                </Badge>
                {needsChainSwitch && (
                  <span className="text-xs text-amber-500">Switch network required</span>
                )}
              </div>

              {/* Action button */}
              {!isConnected ? (
                <Button disabled className="w-full">
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet to Register
                </Button>
              ) : (
                <Button 
                  className="w-full bg-[#0052FF] hover:bg-[#0040CC] text-white"
                  onClick={handleRegister}
                  disabled={!totalPrice || availabilityStatus !== 'available'}
                >
                  {needsChainSwitch ? 'Switch to Base & Register' : 'Register Name'}
                </Button>
              )}
            </>
          )}

          {step === 'registering' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-[#0052FF]" />
              <div>
                <p className="font-semibold">
                  {isWritePending ? 'Confirm in Wallet' : 'Registering...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isWritePending 
                    ? 'Please confirm the transaction in your wallet'
                    : 'Waiting for transaction confirmation...'}
                </p>
              </div>
              {txHash && (
                <a 
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#0052FF] hover:underline"
                >
                  View on BaseScan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">Registration Complete!</p>
                <p className="text-muted-foreground mt-1">{name} is now yours</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(`https://basescan.org/tx/${txHash}`, '_blank')}
                >
                  View Transaction
                </Button>
                <Button 
                  className="flex-1 bg-[#0052FF] hover:bg-[#0040CC]"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.assign(`/${name}`);
                  }}
                >
                  View Profile
                </Button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">Registration Failed</p>
                <p className="text-sm text-muted-foreground mt-1 break-words max-w-xs mx-auto">
                  {errorMsg || 'Something went wrong'}
                </p>
              </div>
              <Button 
                className="w-full"
                onClick={() => {
                  setStep('quote');
                  setErrorMsg(null);
                  resetWrite();
                }}
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
