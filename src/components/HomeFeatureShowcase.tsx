import React from 'react';
import { motion } from 'framer-motion';

import vanityBoxAvatar from '@/assets/vanity-box-avatar.png';
import vanityAptAvatar from '@/assets/vanity-apt-avatar.jpeg';
import vanityHlAvatar from '@/assets/vanity-hl-avatar.png';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';
import vanityTonAvatar from '@/assets/vanity-ton-avatar.png';
import vanityVetAvatar from '@/assets/vanity-vet-avatar.png';
import suiLogo from '@/assets/sui-logo.png';

const avatars = [
  { id: 'iota', src: vanityIotaAvatar, label: 'Vanity.Iota' },
  { id: 'box', src: vanityBoxAvatar, label: 'Vanity.Box' },
  { id: 'ton', src: vanityTonAvatar, label: 'Vanity.Ton' },
  { id: 'vet', src: vanityVetAvatar, label: 'Vanity.Vet' },
  { id: 'sui', src: suiLogo, label: 'Vanity.Sui' },
  { id: 'apt', src: vanityAptAvatar, label: 'Vanity.Apt' },
  { id: 'hl', src: vanityHlAvatar, label: 'Vanity.Hl' },
];

// Each avatar orbits around the center at a fixed radius
const RADIUS = 130; // px from center
const RADIUS_MD = 170; // larger screens

export const HomeFeatureShowcase: React.FC = () => {
  return (
    <div className="relative w-full flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Center text */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#D4AF37] text-center z-10"
      >
        Coming Soon
      </motion.h1>

      {/* Orbiting avatars */}
      {avatars.map((av, i) => {
        const angle = (360 / avatars.length) * i;
        return (
          <motion.div
            key={av.id}
            className="absolute"
            style={{ 
              // position each avatar at its starting angle on the circle
              top: '50%',
              left: '50%',
            }}
            animate={{
              rotate: [angle, angle + 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {/* Inner wrapper to counter-rotate the avatar so it stays upright */}
            <motion.div
              className="flex flex-col items-center"
              style={{
                // offset from the rotation center by RADIUS
                transform: `translateX(${RADIUS}px) translateX(-50%) translateY(-50%)`,
              }}
              animate={{
                rotate: [-(angle), -(angle + 360)],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-lg bg-background">
                <img src={av.src} alt={av.label} className="w-full h-full object-cover" />
              </div>
              <span className="text-[8px] md:text-[10px] text-[#D4AF37] font-medium mt-1 whitespace-nowrap">
                {av.label}
              </span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};
