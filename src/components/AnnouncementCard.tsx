import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Zap } from 'lucide-react';

export const AnnouncementCard: React.FC = () => {
  return (
    <Card className="border border-border/50 bg-gradient-subtle backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center animate-pulse-glow">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Web3 Identity Revolution!</h3>
              <p className="text-muted-foreground text-sm">
                Discover and manage all your Web3 identities in one place. Connect your ENS, Lens, Farcaster, and more.
              </p>
            </div>
            <Button variant="default" size="sm" className="w-fit">
              <ExternalLink className="w-4 h-4 mr-2" />
              Learn More
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};