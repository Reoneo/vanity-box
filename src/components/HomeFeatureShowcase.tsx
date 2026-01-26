import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Zap, Users, ArrowDown, Sparkles, Link2 } from 'lucide-react';

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
    icon: Users,
    title: "Connect",
    description: "Discover & collaborate",
    gradient: "from-[#D4AF37] to-[#DAA520]",
  },
];

export const HomeFeatureShowcase: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden">
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
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8">
        
        {/* Hero Section - Larger and more impactful */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center space-y-3"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
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
            className="text-muted-foreground text-base sm:text-lg font-medium tracking-wide"
          >
            One name. Every chain. Infinite possibilities.
          </motion.p>
        </motion.div>

        {/* Address Comparison Card - More polished */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full"
        >
          <div className="relative bg-card backdrop-blur-xl rounded-2xl border border-[#D4AF37]/30 p-5 sm:p-6 shadow-xl shadow-[#D4AF37]/10 overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            
            {/* Before */}
            <div className="relative flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-muted/80 flex items-center justify-center flex-shrink-0 border border-border/50">
                <Link2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium mb-1">Before</p>
                <p className="font-mono text-sm text-foreground/50 truncate">
                  0x0b08dA7068b73A579Bd5E8a...
                </p>
              </div>
            </div>
            
            {/* Animated Divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
              <motion.div 
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30"
              >
                <ArrowDown className="w-4 h-4 text-white" />
              </motion.div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
            </div>
            
            {/* After */}
            <div className="relative flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#D4AF37]/40 ring-2 ring-[#D4AF37]/20 ring-offset-2 ring-offset-card">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#D4AF37] uppercase tracking-widest font-semibold mb-1">After</p>
                <p className="font-bold text-lg sm:text-xl text-foreground">
                  yourname.eth
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards - Enhanced design */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full grid grid-cols-3 gap-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-card/80 backdrop-blur-md border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:shadow-lg hover:shadow-[#D4AF37]/10 transition-all duration-300 cursor-default"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg shadow-[#D4AF37]/20`}>
                <feature.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground text-sm">{feature.title}</p>
                <p className="text-muted-foreground text-[11px] leading-snug mt-1">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA - More prominent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/60" />
          <p className="text-muted-foreground text-sm font-medium tracking-wide">
            Search any name to begin
          </p>
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/60" />
        </motion.div>
      </div>
    </div>
  );
};