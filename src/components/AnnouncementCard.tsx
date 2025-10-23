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
              <h3 className="text-lg font-semibold text-foreground">Getting Started with Vanity</h3>
              <ul className="text-muted-foreground text-sm space-y-2 mt-3 list-none">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-semibold">1.</span>
                  <span>Create a multi-chain Ethereum wallet via World App</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-semibold">2.</span>
                  <span>Stand out with a personalized digital ID</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-semibold">3.</span>
                  <span>Build your onchain identity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-semibold">4.</span>
                  <span>Full digital ID management coming soon via ENS v2</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-semibold">5.</span>
                  <span>Learn about the Ethereum Follow Protocol as it will be coming to World Chain soon</span>
                </li>
              </ul>
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