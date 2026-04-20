import { useState, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface LoadingProgressProps {
  isLoading: boolean;
  title?: string;
  primaryLabel?: string | null;
  secondaryLabel?: string | null;
}

export const LoadingProgress = ({ isLoading, title, primaryLabel, secondaryLabel }: LoadingProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoading) {
      // Quick transition to 100% when loading completes
      setProgress(100);
      // Hide after a brief delay
      const hideTimer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(hideTimer);
    }

    setVisible(true);
    setProgress(0);
    
    // Fast progressive loading - reaches 90% quickly, then slows down
    const startTime = Date.now();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      
      // Fast exponential curve: reaches ~90% in 800ms, then slows to asymptote at 98%
      // Formula: 98 * (1 - e^(-elapsed/300))
      const targetProgress = Math.min(98, 98 * (1 - Math.exp(-elapsed / 300)));
      
      setProgress(Math.round(targetProgress));
      
      if (elapsed < 5000) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border/60 bg-background/95 p-6 shadow-2xl shadow-primary/10">
        <div className="space-y-5">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold text-foreground">
              {title || (secondaryLabel ? 'Loading linked profile' : 'Loading profile')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {secondaryLabel ? 'Merging searched branding with linked IOTA data.' : 'Fetching the latest profile data.'}
            </p>
          </div>

          {(primaryLabel || secondaryLabel) && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {primaryLabel && <Badge variant="secondary" className="max-w-full truncate px-3 py-1">{primaryLabel}</Badge>}
              {secondaryLabel && (
                <>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant="outline" className="max-w-full truncate px-3 py-1">{secondaryLabel}</Badge>
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Preparing view</span>
              <span>{Math.max(5, progress)}%</span>
            </div>
            <Progress
              value={progress}
              className="h-2 overflow-hidden rounded-full bg-muted transition-all duration-150"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="h-2 rounded-full bg-muted/80" />
            <div className="h-2 rounded-full bg-muted/60" />
            <div className="h-2 rounded-full bg-muted/40" />
          </div>
        </div>
      </div>
    </div>
  );
};
