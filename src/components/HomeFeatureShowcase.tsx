import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Zap, Globe, ArrowDown, Wallet, Shield, Layers } from 'lucide-react';
import vanitySilhouetteAvatar from '@/assets/vanity-silhouette-avatar.jpeg';

const features = [
  {
    icon: Fingerprint,
    title: "Identity",
    description: "Powered by IOTA DID",
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
    description: "Matching .box URL link",
    gradient: "from-[#D4AF37] to-[#DAA520]",
  },
];

export const HomeFeatureShowcase: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-6 sm:pt-10 px-4 sm:px-6 overflow-hidden">
      {/* Luxury Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-[#D4AF37]/3" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#D4AF37]/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#D4AF37]/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-5 sm:gap-8">
        
        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            <span className="text-foreground">Your </span>
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent">
              Web3
            </span>
            <br />
            <span className="text-foreground">Identity</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-muted-foreground text-sm sm:text-base max-w-xs mx-auto"
          >
            One name. Every chain. Your profile.
          </motion.p>
        </motion.div>

        {/* Address → Name Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <div className="relative bg-card/60 backdrop-blur-2xl rounded-2xl border border-[#D4AF37]/20 p-5 sm:p-6 shadow-2xl shadow-[#D4AF37]/5 overflow-hidden">
            {/* Subtle shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/5 to-transparent -translate-x-full animate-[shimmer_4s_infinite]" />
            
            {/* Before */}
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 border border-border/40">
                <Wallet className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Before</p>
                <p className="font-mono text-xs text-foreground/40 truncate">
                  0x0b08dA7068b73A579Bd5E8a...
                </p>
              </div>
            </div>
            
            {/* Divider with arrow */}
            <div className="flex items-center gap-3 my-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
              <motion.div 
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center shadow-lg shadow-[#D4AF37]/25"
              >
                <ArrowDown className="w-3.5 h-3.5 text-white" />
              </motion.div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
            </div>
            
            {/* After */}
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-lg shadow-[#D4AF37]/30 ring-2 ring-[#D4AF37]/30">
                <img 
                  src={vanitySilhouetteAvatar} 
                  alt="Vanity ID Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-[#D4AF37] uppercase tracking-[0.2em] font-semibold">After</p>
                <p className="font-bold text-lg text-foreground">
                  Name.Vanity<span className="text-[#D4AF37]">.iota</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full grid grid-cols-3 gap-2.5 sm:gap-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.08 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-card/50 backdrop-blur-md border border-[#D4AF37]/15 hover:border-[#D4AF37]/40 hover:shadow-lg hover:shadow-[#D4AF37]/10 transition-all duration-300 cursor-default group"
            >
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-md shadow-[#D4AF37]/15 group-hover:shadow-lg group-hover:shadow-[#D4AF37]/25 transition-shadow duration-300`}>
                <feature.icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground text-xs sm:text-sm">{feature.title}</p>
                <p className="text-muted-foreground text-[10px] sm:text-[11px] leading-snug mt-0.5">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats / Trust Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="w-full flex items-center justify-center gap-6 pt-1"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-[#D4AF37]/70" />
            <span className="text-[11px] font-medium">Decentralized</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="w-3.5 h-3.5 text-[#D4AF37]/70" />
            <span className="text-[11px] font-medium">Multi-chain</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="w-3.5 h-3.5 text-[#D4AF37]/70" />
            <span className="text-[11px] font-medium">Open</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
