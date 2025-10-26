import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
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
    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-4">
      {/* Heading */}
      <div className="text-center space-y-2 mb-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-lg md:text-xl font-semibold text-foreground">
            Transform Your Wallet Address
          </h3>
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          Replace long, confusing wallet addresses with memorable human-readable names
        </p>
      </div>

      {/* Animation Container */}
      <div className="relative w-full max-w-lg">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          {/* World ID (Before) */}
          <div
            className={cn(
              "flex-1 transition-all duration-700 ease-in-out",
              isTransformed && "opacity-40 scale-95"
            )}
          >
            <div className="bg-muted/50 backdrop-blur-sm border-2 border-border rounded-xl p-4 text-center">
              <div className="text-xs text-muted-foreground mb-2 font-medium">Before</div>
              <div className="font-mono text-sm md:text-base text-foreground break-all">
                {current.worldId}
              </div>
              <div className="text-xs text-muted-foreground/60 mt-2">Complex Wallet Address</div>
            </div>
          </div>

          {/* Arrow Indicator */}
          <div className="flex-shrink-0">
            <div
              className={cn(
                "transition-all duration-500",
                isTransformed ? "text-[#D4AF37] scale-110" : "text-muted-foreground/40"
              )}
            >
              <ArrowRight className="w-6 h-6 md:w-8 md:h-8" />
            </div>
          </div>

          {/* Domain (After) */}
          <div
            className={cn(
              "flex-1 transition-all duration-700 ease-in-out",
              !isTransformed && "opacity-40 scale-95"
            )}
          >
            <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#F4E4BC]/10 backdrop-blur-sm border-2 border-[#D4AF37]/50 rounded-xl p-4 text-center shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <div className="text-xs text-[#D4AF37] mb-2 font-medium">After</div>
              <div className="font-bold text-base md:text-lg bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent break-all">
                {current.domain}
              </div>
              <div className="text-xs text-muted-foreground/80 mt-2">Your Memorable Identity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <p className="text-xs md:text-sm text-muted-foreground/80">
          ↑ Search for a name above to get started
        </p>
      </div>
    </div>
  );
};
