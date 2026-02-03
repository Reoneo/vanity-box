import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Zap, Globe, ArrowDown, Wallet } from 'lucide-react';
import vanitySilhouetteAvatar from '@/assets/vanity-silhouette-avatar.jpeg';

// Extensions to cycle through
const extensions = ['.iota', '.box'];

const features = [
  {
    icon: Fingerprint,
    title: "Identity",
    description: "One name across all chains",
    gradient: "from-[#D4AF37] to-[#B8860B]",
  },
  {
    icon: Zap,
    title: "Simplify",
    description: "Human-readable addresses",
    gradient: "from-[#D4AF37] to-[#C5A028]",
  },
  {
    icon: Globe,
    title: "DNS",
    description: "Matching URL link",
    gradient: "from-[#D4AF37] to-[#DAA520]",
  },
];

export const HomeFeatureShowcase: React.FC = () => {
  const [extensionIndex, setExtensionIndex] = useState(0);

  // Cycle through extensions every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setExtensionIndex((prev) => (prev + 1) % extensions.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-8 sm:pt-8 px-3 sm:px-6 overflow-hidden">
      {/* Luxury Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial gradient backdrop - more pronounced */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/8 via-transparent to-[#D4AF37]/8" />
        
        {/* Subtle diamond pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(45deg, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(-45deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Multiple glow orbs for depth */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[#D4AF37]/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-[#D4AF37]/10 rounded-full blur-[80px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-3 sm:gap-6">
        
        {/* Hero Section - Compact for mobile */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center space-y-1.5 sm:space-y-3"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="text-foreground">Your </span>
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-sm">
                Web3 Identity
              </span>
            </h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-sm sm:text-lg font-medium tracking-wide"
          >
            One name. Every chain. Infinite possibilities.
          </motion.p>
        </motion.div>

        {/* Address Comparison Card - Compact for mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full"
        >
          <div className="relative bg-card backdrop-blur-xl rounded-2xl border border-[#D4AF37]/30 p-4 sm:p-6 shadow-xl shadow-[#D4AF37]/10 overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            
            {/* Before - Centered */}
            <div className="relative flex flex-col items-center text-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-muted/80 flex items-center justify-center flex-shrink-0 border border-border/50">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5 sm:mb-1">Before</p>
                <p className="font-mono text-xs sm:text-sm text-foreground/50">
                  0x0b08dA7068b73A579Bd5E8a...
                </p>
              </div>
            </div>
            
            {/* Animated Divider */}
            <div className="flex items-center gap-3 sm:gap-4 my-3 sm:my-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
              <motion.div 
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30"
              >
                <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </motion.div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
            </div>
            
            {/* After - Centered with animated extension */}
            <div className="relative flex flex-col items-center text-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden flex-shrink-0 shadow-lg shadow-[#D4AF37]/40 ring-2 ring-[#D4AF37]/20 ring-offset-2 ring-offset-card">
                <img 
                  src={vanitySilhouetteAvatar} 
                  alt="Vanity ID Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] text-[#D4AF37] uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">After</p>
                <p className="font-bold text-base sm:text-xl text-foreground">
                  Name.Vanity
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={extensionIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="text-[#D4AF37]"
                    >
                      {extensions[extensionIndex]}
                    </motion.span>
                  </AnimatePresence>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards - Compact for mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full grid grid-cols-3 gap-2 sm:gap-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="flex flex-col items-center gap-1.5 sm:gap-2.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-card/80 backdrop-blur-md border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:shadow-lg hover:shadow-[#D4AF37]/10 transition-all duration-300 cursor-default"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg shadow-[#D4AF37]/20`}>
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground text-xs sm:text-sm">{feature.title}</p>
                <p className="text-muted-foreground text-[10px] sm:text-[11px] leading-snug mt-0.5 sm:mt-1">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </div>
  );
};