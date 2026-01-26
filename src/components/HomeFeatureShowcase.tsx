import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Zap, Users } from 'lucide-react';

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
    <div className="relative w-full h-full flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Luxury Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-[#D4AF37]/5" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Gold accent glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            <span className="text-foreground">Your </span>
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent">
              Web3 Identity
            </span>
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide">
            One name. Every chain. Infinite possibilities.
          </p>
        </motion.div>

        {/* Address Comparison - Compact */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <div className="relative bg-card/80 backdrop-blur-md rounded-2xl border border-[#D4AF37]/20 p-4 shadow-lg shadow-[#D4AF37]/5">
            {/* Before */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-muted-foreground">🔗</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Before</p>
                <p className="font-mono text-xs text-foreground/60 truncate">
                  0x0b08dA7068b73A579Bd5E8a...
                </p>
              </div>
            </div>
            
            {/* Divider with arrow */}
            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
              <motion.span 
                animate={{ y: [0, 2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[#D4AF37] text-lg"
              >
                ↓
              </motion.span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
            </div>
            
            {/* After */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#D4AF37]/30">
                <span className="text-xs">✨</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#D4AF37] uppercase tracking-wider mb-0.5">After</p>
                <p className="font-semibold text-base text-foreground">
                  yourname.eth
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Pills - Horizontal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full grid grid-cols-3 gap-2"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-[#D4AF37]/30 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-md`}>
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-xs">{feature.title}</p>
                <p className="text-muted-foreground text-[10px] leading-tight mt-0.5">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
          <p className="text-muted-foreground text-xs tracking-wide">
            Search any name to begin
          </p>
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
        </motion.div>
      </div>
    </div>
  );
};
