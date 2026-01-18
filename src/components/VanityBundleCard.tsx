import React from 'react';
import { Button } from '@/components/ui/button';

// Import chain logos
import vanityBoxAvatar from '@/assets/vanity-box-avatar.png';
import vanityAptAvatar from '@/assets/vanity-apt-avatar.jpeg';
import vanityHlAvatar from '@/assets/vanity-hl-avatar.png';
import vanityIotaAvatar from '@/assets/vanity-iota-avatar.png';
import vanityTonAvatar from '@/assets/vanity-ton-avatar.jpeg';
import vanityVetAvatar from '@/assets/vanity-vet-avatar.png';

interface VanityBundleCardProps {
  subdomain?: string;
  onBuyBundle?: () => void;
}

const bundleItems = [
  { id: 'box', avatar: vanityBoxAvatar, label: 'Vanity.box' },
  { id: 'apt', avatar: vanityAptAvatar, label: 'Vanity.apt' },
  { id: 'hl', avatar: vanityHlAvatar, label: 'Vanity.hl' },
  { id: 'iota', avatar: vanityIotaAvatar, label: 'Vanity.iota' },
  { id: 'ton', avatar: vanityTonAvatar, label: 'Vanity.ton' },
  { id: 'vet', avatar: vanityVetAvatar, label: 'Vanity.vet' },
];

export const VanityBundleCard: React.FC<VanityBundleCardProps> = ({
  subdomain = 'You',
  onBuyBundle,
}) => {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Premium Bundle Container */}
      <div className="relative rounded-2xl bg-gradient-to-br from-card via-card to-card/80 border border-gold/30 p-6 shadow-xl shadow-gold/10">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/5 via-transparent to-gold/5 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-foreground mb-1">
              Vanity ID Bundle
            </h3>
            <p className="text-sm text-muted-foreground">
              One identity. Multiple chains.
            </p>
          </div>

          {/* Chain Icons Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {bundleItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center gap-2"
              >
                {/* Circular Avatar */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gold/20 bg-background/50 shadow-md">
                    <img
                      src={item.avatar}
                      alt={item.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Subtle ring glow */}
                  <div className="absolute inset-0 rounded-full ring-1 ring-gold/10 ring-offset-1 ring-offset-transparent pointer-events-none" />
                </div>
                
                {/* Subdomain Label */}
                <span className="text-xs font-medium text-foreground/80 text-center leading-tight">
                  {subdomain}.{item.label.split('.')[1]}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={onBuyBundle}
            className="w-full bg-gradient-to-r from-gold via-gold/90 to-gold hover:from-gold/90 hover:to-gold/80 text-background font-semibold py-3 rounded-xl shadow-lg shadow-gold/20 transition-all duration-300 hover:shadow-xl hover:shadow-gold/30 hover:scale-[1.02]"
          >
            Buy Vanity ID Bundle
          </Button>
        </div>

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold/20 rounded-tl-2xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gold/20 rounded-tr-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gold/20 rounded-bl-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold/20 rounded-br-2xl pointer-events-none" />
      </div>
    </div>
  );
};

export default VanityBundleCard;
