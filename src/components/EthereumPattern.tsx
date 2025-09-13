import React from 'react';
import { cn } from '@/lib/utils';

const EthereumLogo: React.FC<{ className?: string; delay?: number }> = ({ className, delay = 0 }) => (
  <div 
    className={cn("ethereum-logo", className)}
    style={{ animationDelay: `${delay}s` }}
  >
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 256 417" 
      className="w-8 h-8"
      style={{
        filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
        transform: 'translateZ(0)',
      }}
    >
      {/* Top pyramid - Golden */}
      <path 
        fill="#D4AF37" 
        d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"
        className="animate-pulse-glow"
      />
      {/* Left side - Lighter gold */}
      <path 
        fill="#F4E4BC" 
        d="M127.962 0L0 212.32l127.962 75.639V154.158z"
      />
      {/* Bottom right - Golden */}
      <path 
        fill="#D4AF37" 
        d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"
        className="animate-pulse-glow"
      />
      {/* Bottom left - Darker gold */}
      <path 
        fill="#C9A876" 
        d="M127.962 416.905v-104.718L0 236.587z"
      />
      {/* Middle right - Medium gold */}
      <path 
        fill="#E6C77F" 
        d="M127.961 287.958l127.96-75.637-127.96-58.162z"
      />
      {/* Middle left - Dark accent */}
      <path 
        fill="#1A1A2E" 
        d="M0 212.32l127.96 75.638V154.159z"
      />
    </svg>
  </div>
);

const LVFlower: React.FC<{ className?: string; delay?: number }> = ({ className, delay = 0 }) => (
  <div 
    className={cn("lv-flower", className)}
    style={{ animationDelay: `${delay}s` }}
  >
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 100 100" 
      className="w-6 h-6"
      style={{
        filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.2))',
        transform: 'translateZ(0)',
      }}
    >
      {/* Four-petaled flower design */}
      <g transform="translate(50,50)">
        <ellipse cx="0" cy="-25" rx="8" ry="18" fill="#F4E4BC" transform="rotate(0)" />
        <ellipse cx="0" cy="-25" rx="8" ry="18" fill="#E6C77F" transform="rotate(90)" />
        <ellipse cx="0" cy="-25" rx="8" ry="18" fill="#D4AF37" transform="rotate(180)" />
        <ellipse cx="0" cy="-25" rx="8" ry="18" fill="#C9A876" transform="rotate(270)" />
        <circle cx="0" cy="0" r="6" fill="#1A1A2E" />
      </g>
    </svg>
  </div>
);

const GoldDot: React.FC<{ className?: string; delay?: number }> = ({ className, delay = 0 }) => (
  <div 
    className={cn("gold-dot", className)}
    style={{ animationDelay: `${delay}s` }}
  >
    <div 
      className="w-2 h-2 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#C9A876]"
      style={{
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
      }}
    />
  </div>
);

export const EthereumPattern: React.FC = () => {
  const patternElements = [];
  
  // Create a 4x2 grid pattern
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const baseX = col * 20;
      const baseY = row * 50;
      const delay = (row * 5 + col) * 0.2;
      
      // Ethereum logos
      patternElements.push(
        <div
          key={`eth-${row}-${col}`}
          className="absolute ethereum-float"
          style={{
            left: `${baseX}%`,
            top: `${baseY + 10}%`,
            animationDelay: `${delay}s`,
          }}
        >
          <EthereumLogo delay={delay} />
        </div>
      );
      
      // LV flowers (offset pattern)
      if (col < 4) {
        patternElements.push(
          <div
            key={`flower-${row}-${col}`}
            className="absolute lv-float"
            style={{
              left: `${baseX + 10}%`,
              top: `${baseY + 30}%`,
              animationDelay: `${delay + 0.5}s`,
            }}
          >
            <LVFlower delay={delay + 0.5} />
          </div>
        );
      }
      
      // Small dots
      patternElements.push(
        <div
          key={`dot1-${row}-${col}`}
          className="absolute dot-float"
          style={{
            left: `${baseX + 15}%`,
            top: `${baseY + 5}%`,
            animationDelay: `${delay + 1}s`,
          }}
        >
          <GoldDot delay={delay + 1} />
        </div>
      );
      
      if (col < 4) {
        patternElements.push(
          <div
            key={`dot2-${row}-${col}`}
            className="absolute dot-float"
            style={{
              left: `${baseX + 5}%`,
              top: `${baseY + 45}%`,
              animationDelay: `${delay + 1.5}s`,
            }}
          >
            <GoldDot delay={delay + 1.5} />
          </div>
        );
      }
    }
  }
  
  return (
    <div className="ethereum-pattern absolute inset-0 overflow-hidden bg-gradient-to-r from-[#1A1A2E] via-[#16213E] to-[#1A1A2E]">
      <div className="relative w-full h-full">
        {patternElements}
        
        {/* Luxury gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};