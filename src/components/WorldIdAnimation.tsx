import React, { useState, useEffect } from 'react';
import { ArrowDown, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const transformations = [
  { 
    worldId: '0x742d35Cc6...', 
    domain: 'Agent.$mith.eth',
    description: 'AI Agent Identity'
  },
  { 
    worldId: '0x8F92A1b4...', 
    domain: '589.TeamXRP.eth',
    description: 'Community Leader'
  },
  { 
    worldId: '0x1E4F8c2D...', 
    domain: 'Tim.Smith.box',
    description: 'Personal Brand'
  },
  { 
    worldId: '0xA3D91F7...', 
    domain: 'ATL.30315.eth',
    description: 'Location Identity'
  },
  { 
    worldId: '0x5C8E2A9...', 
    domain: 'eth.altcoin.chain',
    description: 'Crypto Native'
  },
];

export const WorldIdAnimation: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransformed, setIsTransformed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTransformed) {
        setIsTransformed(true);
      } else {
        setIsTransformed(false);
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % transformations.length);
        }, 1000);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isTransformed]);

  const current = transformations[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center py-6 md:py-10 px-4 space-y-6">
      {/* Elegant Heading */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          <Zap className="w-4 h-4 text-[#D4AF37] animate-pulse" />
          <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent">
            Elevate Your Digital Identity
          </h3>
          <Zap className="w-4 h-4 text-[#D4AF37] animate-pulse" />
          <div className="w-8 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
        <p className="text-sm md:text-base text-white dark:text-muted-foreground max-w-xl px-4">
          Experience the luxury of human-readable blockchain addresses
        </p>
      </div>

      {/* Premium Animation Container - Vertical Layout */}
      <div className="relative w-full max-w-md">
        {/* Ambient glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Before: Complex Address */}
          <div
            className={cn(
              "w-full transition-all duration-700 ease-out",
              isTransformed && "opacity-30 scale-95 blur-[2px]"
            )}
          >
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 dark:from-red-500/30 dark:via-orange-500/30 dark:to-red-500/30 rounded-2xl blur opacity-60" />
              
              <div className="relative bg-gradient-to-br from-background via-muted/80 to-background backdrop-blur-xl border-2 border-red-500/30 dark:border-red-500/40 rounded-2xl p-5 md:p-6 text-center shadow-xl">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <div className="text-xs md:text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    Before
                  </div>
                </div>
                
                <div className="font-mono text-xs md:text-sm text-[#1e3a8a] dark:text-foreground/90 break-all leading-relaxed px-2">
                  {current.worldId}
                </div>
                
                <div className="text-[10px] md:text-xs text-[#1e3a8a]/70 dark:text-muted-foreground/70 mt-3 font-medium">
                  Complex • Unmemorable
                </div>
              </div>
            </div>
          </div>

          {/* Transformation Arrow - Pointing Down */}
          <div className="flex-shrink-0 relative my-2">
            <div
              className={cn(
                "transition-all duration-700 ease-out transform",
                isTransformed 
                  ? "text-[#D4AF37] scale-125 translate-y-0" 
                  : "text-[#1e3a8a]/30 dark:text-muted-foreground/30 scale-100 -translate-y-1"
              )}
            >
              <div className="relative">
                {isTransformed && (
                  <div className="absolute inset-0 animate-ping">
                    <ArrowDown className="w-8 h-8 md:w-10 md:h-10 text-[#D4AF37]/50" />
                  </div>
                )}
                <ArrowDown className="w-8 h-8 md:w-10 md:h-10 relative z-10" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* After: Premium Identity */}
          <div
            className={cn(
              "w-full transition-all duration-700 ease-out",
              !isTransformed && "opacity-30 scale-95 blur-[2px]"
            )}
          >
            <div className="relative group">
              {/* Luxurious glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] rounded-2xl blur-lg opacity-40 dark:opacity-60 group-hover:opacity-60 dark:group-hover:opacity-80 transition-opacity duration-500" />
              
              <div className="relative bg-gradient-to-br from-[#D4AF37]/5 via-background to-[#F4E4BC]/5 dark:from-[#D4AF37]/10 dark:via-background dark:to-[#F4E4BC]/10 backdrop-blur-xl border-2 border-[#D4AF37]/50 dark:border-[#D4AF37]/60 rounded-2xl p-5 md:p-6 text-center shadow-2xl">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-[#D4AF37] animate-pulse" />
                  <div className="text-xs md:text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
                    After
                  </div>
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-[#D4AF37] animate-pulse" />
                </div>
                
                <div className="font-bold text-base md:text-xl bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent break-all leading-relaxed px-2 mb-2">
                  {current.domain}
                </div>
                
                <div className="text-[10px] md:text-xs text-[#D4AF37]/80 dark:text-[#D4AF37]/90 mt-3 font-semibold">
                  {current.description}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Elegant CTA */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 border border-[#D4AF37]/30 dark:border-[#D4AF37]/40">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <p className="text-xs md:text-sm font-medium text-[#1e3a8a] dark:text-foreground/80">
            Search above to claim your premium identity
          </p>
        </div>
      </div>
    </div>
  );
};
