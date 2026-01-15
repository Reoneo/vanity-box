import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from 'lucide-react';
import { useSignMessage, useAccount } from 'wagmi';
import { callEdge } from '@/lib/supaInvoke';
import { toast } from 'sonner';

interface SIWEVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SIWEVerificationModal = ({
  open,
  onOpenChange,
  onSuccess,
  onCancel
}: SIWEVerificationModalProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const handleSignMessage = async () => {
    if (!address) {
      toast.error('No wallet connected');
      return;
    }

    setIsVerifying(true);
    try {
      // Generate nonce from backend
      const nonceData = await callEdge<{ nonce: string }>('generate-siwe-nonce', {});
      
      if (!nonceData?.nonce) {
        throw new Error('Failed to generate verification nonce');
      }

      // Create SIWE message
      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = 'Sign in to Vanity.box to verify wallet ownership.';
      const issuedAt = new Date().toISOString();
      const expirationTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      const message = `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${origin}
Version: 1
Chain ID: 1
Nonce: ${nonceData.nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;

      // Sign the message
      const signature = await signMessageAsync({ 
        message,
        account: address 
      });

      // Verify with backend
      const verifyResult = await callEdge<{ verified: boolean }>('verify-siwe-message', {
        message,
        signature,
        address,
        nonce: nonceData.nonce
      });

      if (verifyResult?.verified) {
        toast.success('Wallet verified successfully!');
        // Store verification in session
        sessionStorage.setItem(`siwe_verified_${address.toLowerCase()}`, 'true');
        window.dispatchEvent(new CustomEvent('wallet-verified', { 
          detail: { address, verified: true } 
        }));
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error('Signature verification failed');
      }
    } catch (error) {
      console.error('SIWE verification error:', error);
      if (error instanceof Error && error.message.includes('User rejected')) {
        toast.error('Signature request was cancelled');
      } else {
        toast.error('Verification failed. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-background border border-border rounded-2xl shadow-xl">
        <DialogHeader className="flex flex-col items-center gap-4 pt-4">
          <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
            <Pencil className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <DialogTitle className="text-xl font-semibold text-center">
            Verify your account
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 py-4 space-y-6">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            To finish connecting, you must sign a message in your wallet to verify that you are the owner of this account.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSignMessage}
              disabled={isVerifying}
              className="w-full h-12 bg-[#D4AF37] hover:bg-[#C49F2F] text-black font-semibold rounded-xl"
            >
              {isVerifying ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Sign message'
              )}
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isVerifying}
              className="w-full h-12 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
