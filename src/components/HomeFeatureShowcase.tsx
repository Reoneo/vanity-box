import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Zap, Users, ArrowRight } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, iconBg, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="flex items-center gap-4 bg-card/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-border/50 max-w-[340px]"
  >
    <div 
      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
      style={{ backgroundColor: iconBg }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-foreground text-base mb-0.5">{title}</h3>
      <p className="text-muted-foreground text-sm leading-snug">{description}</p>
    </div>
  </motion.div>
);

interface ChatBubbleProps {
  message: string;
  isBlue?: boolean;
  align: 'left' | 'right';
  delay: number;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isBlue, align, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, x: align === 'right' ? 20 : -20 }}
    animate={{ opacity: 1, scale: 1, x: 0 }}
    transition={{ duration: 0.4, delay }}
    className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}
  >
    <div 
      className={`relative px-4 py-3 rounded-2xl max-w-[280px] shadow-md ${
        isBlue 
          ? 'bg-[#0052FF] text-white' 
          : 'bg-card text-foreground border border-border/50'
      }`}
    >
      <p className={`text-sm font-medium ${isBlue ? '' : 'font-mono text-xs'}`}>{message}</p>
      {/* Chat tail */}
      <div 
        className={`absolute bottom-2 w-3 h-3 transform rotate-45 ${
          align === 'right' ? '-right-1' : '-left-1'
        } ${isBlue ? 'bg-[#0052FF]' : 'bg-card border-l border-b border-border/50'}`}
        style={align === 'left' && !isBlue ? { borderRight: 'none', borderTop: 'none' } : {}}
      />
    </div>
  </motion.div>
);

export const HomeFeatureShowcase: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* Dotted Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1.5px, transparent 1.5px)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/50" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col gap-6">
        
        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-2"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Your <span className="text-[#D4AF37]">Web3 Identity</span>
          </h1>
          <p className="text-muted-foreground text-sm">One name. Every chain. Infinite possibilities.</p>
        </motion.div>

        {/* Chat Conversation Demo */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-border/50 space-y-3"
        >
          <ChatBubble 
            message="What's your crypto address so I can pay you?"
            isBlue
            align="right"
            delay={0.4}
          />
          <ChatBubble 
            message="0x0b08dA7068b73A579Bd5E8a8290ff8afd37bc32A"
            align="left"
            delay={0.7}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex items-center justify-center gap-2 py-2"
          >
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
            <span className="text-xs text-[#D4AF37] font-medium px-2">vs</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
          </motion.div>
          <ChatBubble 
            message="This is so much simpler! Send to yourname.eth"
            align="left"
            delay={1.2}
          />
          <ChatBubble 
            message="Done! That was easy 🎉"
            isBlue
            align="right"
            delay={1.5}
          />
        </motion.div>

        {/* Feature Cards */}
        <div className="space-y-3">
          <FeatureCard
            icon={<Fingerprint className="w-7 h-7 text-white" />}
            iconBg="#0052FF"
            title="Build your onchain identity"
            description="Use your name as your identity across every blockchain."
            delay={1.7}
          />
          <FeatureCard
            icon={<Zap className="w-7 h-7 text-white" />}
            iconBg="#22C55E"
            title="Simplify transactions"
            description="Send and receive seamlessly with a readable name."
            delay={1.9}
          />
          <FeatureCard
            icon={<Users className="w-7 h-7 text-white" />}
            iconBg="#A855F7"
            title="Connect and collaborate"
            description="Find others and build together by viewing profiles."
            delay={2.1}
          />
        </div>

        {/* CTA Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 0.5 }}
          className="flex items-center justify-center gap-2 text-muted-foreground text-sm pt-2"
        >
          <span>Search any name to get started</span>
          <ArrowRight className="w-4 h-4 animate-pulse" />
        </motion.div>
      </div>
    </div>
  );
};
