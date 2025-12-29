import { useState, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';

interface LoadingProgressProps {
  isLoading: boolean;
}

export const LoadingProgress = ({ isLoading }: LoadingProgressProps) => {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border-2 border-[#D4AF37]/30 w-full max-w-md mx-4">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
            Loading
          </h3>
          <Progress 
            value={progress} 
            className="h-3 bg-gray-200 dark:bg-gray-800 transition-all duration-150"
          />
          <p className="text-center text-sm font-medium text-[#D4AF37]">
            {progress}%
          </p>
        </div>
      </div>
    </div>
  );
};
