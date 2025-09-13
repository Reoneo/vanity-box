import React from 'react';
import { cn } from '@/lib/utils';

const EthereumLogo: React.FC<{ className?: string; delay?: number }> = ({ className, delay = 0 }) => (
  <div 
    className={cn("ethereum-logo", className)}
    style={{ animationDelay: `${delay}s` }}
  >
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 256 417" 
      className="w-6 h-6 text-white/20 hover:text-white/40 transition-colors duration-300"
      style={{
        filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.1))',
        transform: 'translateZ(0)',
      }}
    >
      <path 
        fill="currentColor" 
        d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"
        className="animate-pulse-glow"
      />
      <path 
        fill="currentColor" 
        d="M127.962 0L0 212.32l127.962 75.639V154.158z"
        style={{ opacity: 0.6 }}
      />
      <path 
        fill="currentColor" 
        d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"
        className="animate-pulse-glow"
      />
      <path 
        fill="currentColor" 
        d="M127.962 416.905v-104.718L0 236.587z"
        style={{ opacity: 0.6 }}
      />
      <path 
        fill="currentColor" 
        d="M127.961 287.958l127.96-75.637-127.96-58.162z"
        style={{ opacity: 0.8 }}
      />
      <path 
        fill="currentColor" 
        d="M0 212.32l127.96 75.638V154.159z"
        style={{ opacity: 0.4 }}
      />
    </svg>
  </div>
);

export const EthereumPattern: React.FC = () => {
  const logoCount = 15;
  
  return (
    <div className="ethereum-pattern absolute inset-0 overflow-hidden">
      <div className="relative w-full h-full">
        {Array.from({ length: logoCount }).map((_, index) => {
          const delay = index * 0.3;
          const xPosition = (index * 60) % 100;
          const yPosition = Math.floor(index / 8) * 50;
          
          return (
            <div
              key={index}
              className="absolute ethereum-float"
              style={{
                left: `${xPosition}%`,
                top: `${yPosition}%`,
                animationDelay: `${delay}s`,
                transform: 'translateZ(0)',
              }}
            >
              <EthereumLogo delay={delay} />
            </div>
          );
        })}
        
        {/* Luxury gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};