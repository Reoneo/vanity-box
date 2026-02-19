// List of Verifiable Credentials with Present action

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Clock, FileText, ChevronRight } from 'lucide-react';
import type { VerifiableCredential } from '@/types/identity';
import { formatDistanceToNow } from 'date-fns';

interface CredentialListProps {
  credentials: VerifiableCredential[];
  onPresentCredential: (vcJwt: string) => void;
  isLoading?: boolean;
  selectedVcJwt?: string | null;
}

export function CredentialList({
  credentials,
  onPresentCredential,
  isLoading = false,
  selectedVcJwt,
}: CredentialListProps) {
  if (credentials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No credentials yet</p>
        <p className="text-xs text-muted-foreground mt-1">Request a credential to get started</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[240px]">
      <div className="space-y-3">
        {credentials.map((vc, index) => (
          <Card 
            key={index} 
            className={`transition-all ${selectedVcJwt === vc.vcJwt ? 'ring-2 ring-[#D4AF37]' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {vc.claims.name || vc.claims.address}
                      </span>
                      <Badge variant="outline" className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30">
                        {vc.claims.chain}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {vc.type}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        Issued {formatDistanceToNow(new Date(vc.issuedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPresentCredential(vc.vcJwt)}
                  disabled={isLoading}
                  className="flex-shrink-0 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                >
                  Present
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
