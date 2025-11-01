import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Sphere } from '@react-three/drei';
import { Suspense } from 'react';
import { Twitter, Globe, Wallet, Instagram, Youtube, Facebook } from 'lucide-react';
import { FaPassport, FaIdCard } from 'react-icons/fa';
import { SiDiscord } from 'react-icons/si';

interface IdentityFlowVisualizationProps {
  worldId: string;
  vanityName: string;
}

function Scene({ worldId, vanityName }: IdentityFlowVisualizationProps) {
  return (
    <>
      <OrbitControls enableZoom={false} enablePan={false} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* World ID at top */}
      <group position={[0, 3, 0]}>
        <Sphere args={[0.5, 32, 32]}>
          <meshStandardMaterial color="hsl(var(--primary))" />
        </Sphere>
        <Text
          position={[0, 1, 0]}
          fontSize={0.3}
          color="hsl(var(--foreground))"
          anchorX="center"
          anchorY="middle"
        >
          {worldId}
        </Text>
      </group>

      {/* Arrow down */}
      <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.2, 0.8, 3]} />
        <meshStandardMaterial color="hsl(var(--primary))" />
      </mesh>

      {/* Vanity name in middle */}
      <group position={[0, 0, 0]}>
        <RoundedBox args={[3, 1, 0.2]} radius={0.1}>
          <meshStandardMaterial color="hsl(var(--primary))" />
        </RoundedBox>
        <Text
          position={[0, 0, 0.2]}
          fontSize={0.4}
          color="hsl(var(--primary-foreground))"
          anchorX="center"
          anchorY="middle"
        >
          {vanityName}
        </Text>
      </group>

      {/* Arrow down */}
      <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.2, 0.8, 3]} />
        <meshStandardMaterial color="hsl(var(--primary))" />
      </mesh>

      {/* Connected services at bottom */}
      <group position={[-2.5, -3, 0]}>
        <RoundedBox args={[1, 1, 0.2]} radius={0.1}>
          <meshStandardMaterial color="hsl(var(--accent))" />
        </RoundedBox>
      </group>

      <group position={[-0.8, -3, 0]}>
        <RoundedBox args={[1, 1, 0.2]} radius={0.1}>
          <meshStandardMaterial color="hsl(var(--accent))" />
        </RoundedBox>
      </group>

      <group position={[0.8, -3, 0]}>
        <RoundedBox args={[1, 1, 0.2]} radius={0.1}>
          <meshStandardMaterial color="hsl(var(--accent))" />
        </RoundedBox>
      </group>

      <group position={[2.5, -3, 0]}>
        <RoundedBox args={[1, 1, 0.2]} radius={0.1}>
          <meshStandardMaterial color="hsl(var(--accent))" />
        </RoundedBox>
      </group>

      {/* Wallet icon */}
      <group position={[3, -4.2, 0]}>
        <Sphere args={[0.4, 32, 32]}>
          <meshStandardMaterial color="hsl(var(--muted))" />
        </Sphere>
      </group>
    </>
  );
}

export const IdentityFlowVisualization: React.FC<IdentityFlowVisualizationProps> = ({
  worldId,
  vanityName,
}) => {
  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden bg-background/50 backdrop-blur-sm border border-border">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene worldId={worldId} vanityName={vanityName} />
        </Suspense>
      </Canvas>
      
      {/* 2D overlay icons - positioned at bottom representing connected services */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-4 sm:gap-8 px-4 pointer-events-none">
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 flex items-center justify-center">
            <Twitter className="w-6 h-6 sm:w-7 sm:h-7 text-[#1DA1F2]" />
          </div>
          <span className="text-[10px] text-muted-foreground">Social</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <span className="text-[10px] text-muted-foreground">Website</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <FaPassport className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <span className="text-[10px] text-muted-foreground">Passport</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <FaIdCard className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <span className="text-[10px] text-muted-foreground">License</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <span className="text-[10px] text-muted-foreground">Wallet</span>
        </div>
      </div>
    </div>
  );
};
