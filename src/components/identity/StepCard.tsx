// Reusable Step Card Component for Identity Flow

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'pending' | 'active' | 'completed' | 'error';

interface StepCardProps {
  title: string;
  description: string;
  status: StepStatus;
  stepNumber: number;
  isLoading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  errorMessage?: string;
}

export function StepCard({
  title,
  description,
  status,
  stepNumber,
  isLoading = false,
  actionLabel,
  onAction,
  disabled = false,
  children,
  errorMessage,
}: StepCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
      case 'active':
        return 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]';
      case 'error':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      default:
        return 'bg-muted/20 border-muted/50 text-muted-foreground';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
            <Check className="w-3 h-3 mr-1" />
            Complete
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="outline" className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/50">
            Current Step
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted/20 text-muted-foreground border-muted/50">
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card className={cn(
      'transition-all duration-300',
      status === 'active' && 'ring-1 ring-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10',
      status === 'pending' && 'opacity-60'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0 font-bold text-sm',
              getStatusColor()
            )}>
              {status === 'completed' ? (
                <Check className="w-4 h-4" />
              ) : (
                stepNumber
              )}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm mt-1">{description}</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      {(children || (status === 'active' && actionLabel)) && (
        <CardContent className="pt-0">
          {children}
          
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 mb-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {status === 'active' && actionLabel && onAction && (
            <Button
              onClick={onAction}
              disabled={disabled || isLoading}
              className="w-full mt-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionLabel}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
