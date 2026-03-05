import React from 'react';
import { motion } from 'framer-motion';

export const HomeFeatureShowcase: React.FC = () => {
  return (
    <div className="relative w-full flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#D4AF37] text-center"
      >
        Coming Soon
      </motion.h1>
    </div>
  );
};
