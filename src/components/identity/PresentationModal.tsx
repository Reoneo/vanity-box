// Presentation Modal - Shows VP JWT with Copy and QR options

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, QrCode, FileCode2, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface PresentationModalProps {
  open: boolean;
  onClose: () => void;
  vpJwt: string | null;
  expiresAt?: string;
  nonce?: string;
  onVerify?: () => void;
}

export function PresentationModal({
  open,
  onClose,
  vpJwt,
  expiresAt,
  nonce,
  onVerify,
}: PresentationModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!vpJwt) return;
    
    try {
      await navigator.clipboard.writeText(vpJwt);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Calculate remaining time
  const getRemainingTime = () => {
    if (!expiresAt) return null;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-[#D4AF37]" />
            Verifiable Presentation
          </DialogTitle>
          <DialogDescription>
            Your VP JWT is ready. Share it with a verifier to prove your identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30">
              <Shield className="w-3 h-3 mr-1" />
              Signed
            </Badge>
            {expiresAt && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                <Clock className="w-3 h-3 mr-1" />
                Expires in {getRemainingTime()}
              </Badge>
            )}
          </div>

          {/* Nonce */}
          {nonce && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Challenge Nonce</label>
              <div className="p-2 rounded bg-muted/30 font-mono text-xs break-all">
                {nonce.slice(0, 32)}...
              </div>
            </div>
          )}

          {/* VP JWT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">VP JWT Token</label>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-8"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <ScrollArea className="h-[180px]">
              <div className="p-3 rounded-lg bg-black/50 font-mono text-xs">
                <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                  {vpJwt}
                </pre>
              </div>
            </ScrollArea>
          </div>

          {/* QR Code Placeholder */}
          <div className="flex items-center justify-center p-6 rounded-lg bg-muted/20 border border-dashed border-muted-foreground/30">
            <div className="text-center">
              <QrCode className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">QR Code (coming soon)</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            {onVerify && (
              <Button
                onClick={() => {
                  onClose();
                  onVerify();
                }}
                className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
              >
                Verify Now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
