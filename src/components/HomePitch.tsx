import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Link2, Shield, Coins, Image, Users } from 'lucide-react';

export const HomePitch: React.FC = () => {

  const features = [
    {
      icon: Globe,
      title: 'Multi-Chain Identity',
      description: 'Connect Ethereum, Aptos, TON & more',
      gradient: 'from-blue-500/20 to-purple-500/20'
    },
    {
      icon: Link2,
      title: 'Premium Vanity Links',
      description: 'yourname.vanity.box, .cash, .eth',
      gradient: 'from-amber-500/20 to-orange-500/20'
    },
    {
      icon: Shield,
      title: 'Human Verification',
      description: 'World ID proof-of-humanity',
      gradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
      icon: Coins,
      title: 'Crypto Payments',
      description: 'Accept WLD, USDC, ETH',
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
      icon: Image,
      title: 'NFT Showcase',
      description: 'Display POAPs & collectibles',
      gradient: 'from-cyan-500/20 to-blue-500/20'
    },
    {
      icon: Users,
      title: 'Social Integration',
      description: 'Link all your social profiles',
      gradient: 'from-pink-500/20 to-rose-500/20'
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Hero Text */}
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-3 bg-gradient-to-r from-[#FFD700] via-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent tracking-wide drop-shadow-sm">
          Your Decentralized Identity Hub
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg font-light tracking-wide">
          One Name. All Your Web3.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="group relative overflow-hidden bg-card/80 backdrop-blur-sm border border-border/40 hover:border-[#D4AF37]/60 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#D4AF37]/30"
            >
              <CardContent className="p-5 sm:p-6 flex flex-col items-center text-center space-y-3">
                {/* Icon with premium gradient background and gold ring */}
                <div className="relative">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center ring-2 ring-[#D4AF37]/30 group-hover:ring-[#D4AF37]/60 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-foreground group-hover:text-[#D4AF37] transition-colors duration-300" />
                  </div>
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-[#D4AF37]/0 group-hover:bg-[#D4AF37]/10 blur-xl transition-all duration-500" />
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-sm sm:text-base leading-tight group-hover:text-[#D4AF37] transition-colors duration-300">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>

              {/* Premium gradient border overlay on hover */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#FFD700]/20 via-[#D4AF37]/20 to-[#B8860B]/20" />
              </div>
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
