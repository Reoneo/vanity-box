import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Link2, Shield, Coins, Image, Users } from 'lucide-react';
import { useTheme } from 'next-themes';

export const HomePitch: React.FC = () => {
  const { theme } = useTheme();

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
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Hero Text */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Your Decentralized Identity Hub
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          One Name. All Your Web3.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="group relative overflow-hidden border-border/50 hover:border-[#D4AF37] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#D4AF37]/20"
            >
              <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center space-y-2">
                {/* Icon with gradient background */}
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" />
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-sm sm:text-base leading-tight">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
                  {feature.description}
                </p>
              </CardContent>

              {/* Gold accent border on hover */}
              <div className="absolute inset-0 border-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
            </Card>
          );
        })}
      </div>

      {/* Bottom CTA Badge */}
      <div className="flex justify-center mt-6">
        <Badge 
          variant="outline" 
          className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 px-4 py-1.5 text-xs sm:text-sm"
        >
          🌟 Claim Your Identity Today
        </Badge>
      </div>
    </div>
  );
};
