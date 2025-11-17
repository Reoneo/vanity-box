import React from 'react';
import { IdentityFlowVisualization } from '@/components/IdentityFlowVisualization';
import { Button } from '@/components/ui/button';

export const WorldIdAnimation: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-0.5 px-2">
      {/* Identity Flow Visualization */}
      <div className="relative w-full max-w-lg">
        <IdentityFlowVisualization 
          worldId="demo.2025.world.id"
          vanityName="YourName.Vanity.box"
        />
      </div>
    </div>
  );
};
