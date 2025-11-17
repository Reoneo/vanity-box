import React from 'react';
import { IdentityFlowVisualization } from '@/components/IdentityFlowVisualization';
import { Button } from '@/components/ui/button';

export const WorldIdAnimation: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-1 px-4">
      {/* Identity Flow Visualization */}
      <div className="relative w-full max-w-3xl">
        <IdentityFlowVisualization 
          worldId="demo.2025.world.id"
          vanityName="YourName.Vanity.box"
        />
      </div>
    </div>
  );
};
