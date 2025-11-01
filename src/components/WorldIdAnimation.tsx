import React from 'react';
import { IdentityFlowVisualization } from '@/components/IdentityFlowVisualization';
import { Button } from '@/components/ui/button';

export const WorldIdAnimation: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-6 md:py-10 px-4 space-y-6">
      {/* 3D Identity Flow Visualization */}
      <div className="relative w-full max-w-3xl">
        <IdentityFlowVisualization 
          worldId="demo.2025.world.id"
          vanityName="Tim.Vanity.box"
        />
      </div>

      {/* Elegant CTA */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 border border-[#D4AF37]/30 dark:border-[#D4AF37]/40">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <p className="text-xs md:text-sm font-medium text-[#1e3a8a] dark:text-foreground/80">
            Connect your World ID to premium vanity names
          </p>
          <Button 
            asChild 
            size="sm" 
            className="h-7 px-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
          >
            <a href="https://world.org" target="_blank" rel="noopener noreferrer">
              Learn more
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
