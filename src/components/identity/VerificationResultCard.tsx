// Verification Result Display Card

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, ShieldCheck, ShieldX, Clock, User, FileCode2, Link2 } from 'lucide-react';
import type { VerificationResult } from '@/types/identity';
import { useIdentity } from '@/contexts/IdentityContext';
import { formatDistanceToNow } from 'date-fns';

interface VerificationResultCardProps {
  result: VerificationResult;
}

export function VerificationResultCard({ result }: VerificationResultCardProps) {
  const isValid = result.valid;
  const { vcList } = useIdentity();

  // Find the latest EthereumWalletOwnershipCredential
  const ethVc = vcList.find(
    vc => vc.type === 'EthereumWalletOwnershipCredential' && vc.claims?.address
  );

  return (
    <Card className={`transition-all ${isValid ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isValid ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              {isValid ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <ShieldX className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {isValid ? 'Verification Successful' : 'Verification Failed'}
              </CardTitle>
              {result.verifiedAt && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    Verified {formatDistanceToNow(new Date(result.verifiedAt), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={isValid 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
              : 'bg-red-500/20 text-red-400 border-red-500/50'
            }
          >
            {isValid ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Valid
              </>
            ) : (
              <>
                <X className="w-3 h-3 mr-1" />
                Invalid
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Claims Section */}
        {result.claims && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-[#D4AF37]" />
              Verified Claims
            </h4>
            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-[#D4AF37]">{result.claims.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Chain</span>
                <Badge variant="outline" className="text-xs">
                  {result.claims.chain}
                </Badge>
              </div>
              {/* Linked Ethereum Wallet from EthereumWalletOwnershipCredential */}
              {ethVc && (
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Link2 className="w-3 h-3" />
                    Ethereum Wallet
                  </span>
                  <span className="font-mono text-xs truncate max-w-[200px] text-[#D4AF37]" title={ethVc.claims.address}>
                    {ethVc.claims.address}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subject DID */}
        {result.subjectDid && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#D4AF37]" />
              Subject DID
            </h4>
            <div className="p-3 rounded-lg bg-muted/30">
              <code className="text-xs break-all text-muted-foreground">
                {result.subjectDid}
              </code>
            </div>
          </div>
        )}

        {/* Verification Log */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Verification Log</h4>
          <ScrollArea className="h-[120px]">
            <div className="p-3 rounded-lg bg-black/50 font-mono text-xs">
              <pre className="whitespace-pre-wrap text-muted-foreground">
                {result.output}
              </pre>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
