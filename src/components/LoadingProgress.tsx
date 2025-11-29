import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

interface LoadingProgressProps {
  isLoading: boolean;
}

export const LoadingProgress = ({ isLoading }: LoadingProgressProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    setProgress(0);
    
    // Simulate progressive loading with realistic timing
    const intervals = [
      { time: 100, value: 10 },   // Initial connection
      { time: 300, value: 25 },   // Fetching profile
      { time: 600, value: 45 },   // Loading data
      { time: 1000, value: 65 },  // Processing
      { time: 1500, value: 85 },  // Almost there
      { time: 2000, value: 95 },  // Final touches
    ];

    const timers = intervals.map(({ time, value }) => 
      setTimeout(() => setProgress(value), time)
    );

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      setProgress(100);
    };
  }, [isLoading]);

  if (!isLoading && progress === 100) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border-2 border-[#D4AF37]/30 w-full max-w-md mx-4">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
            Loading
          </h3>
          <Progress 
            value={progress} 
            className="h-3 bg-gray-200 dark:bg-gray-800"
          />
          <p className="text-center text-sm font-medium text-[#D4AF37]">
            {progress}%
          </p>
        </div>
      </div>
    </div>
  );
};
