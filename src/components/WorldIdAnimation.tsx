import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const transformations = [
  { worldId: '0x1A2B3C4D...', domain: 'Agent.$mith.eth' },
  { worldId: '0x9F8E7D6C...', domain: '589.TeamXRP.eth' },
  { worldId: '0x5A6B7C8D...', domain: 'Tim.Smith.box' },
  { worldId: '0x3E4F5A6B...', domain: 'ATL.30315.eth' },
  { worldId: '0x7C8D9E0F...', domain: 'eth.altcoin.chain' },
];

export const WorldIdAnimation: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransformed, setIsTransformed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTransformed) {
        // Transform to domain
        setIsTransformed(true);
      } else {
        // Transform back to World ID and move to next
        setIsTransformed(false);
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % transformations.length);
        }, 1000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isTransformed]);

  const current = transformations[currentIndex];

  return (
    <div className="flex items-center justify-center py-8 px-4">
      <div className="relative min-h-[60px] flex items-center justify-center">
        <div className="text-center">
          {/* World ID */}
          <div
            className={cn(
              "transition-all duration-700 ease-in-out font-mono",
              isTransformed
                ? "opacity-0 scale-95 blur-sm absolute inset-0"
                : "opacity-100 scale-100 blur-0 relative"
            )}
          >
            <div className="text-lg md:text-xl text-muted-foreground">
              {current.worldId}
            </div>
            <div className="text-xs text-muted-foreground/60 mt-1">World ID</div>
          </div>

          {/* Domain */}
          <div
            className={cn(
              "transition-all duration-700 ease-in-out font-bold",
              !isTransformed
                ? "opacity-0 scale-95 blur-sm absolute inset-0"
                : "opacity-100 scale-100 blur-0 relative"
            )}
          >
            <div className="text-xl md:text-2xl bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent">
              {current.domain}
            </div>
            <div className="text-xs text-muted-foreground/80 mt-1">Your Identity</div>
          </div>
        </div>
      </div>
    </div>
  );
};
