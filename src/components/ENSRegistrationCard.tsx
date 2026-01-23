import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Loader2, Check, X } from 'lucide-react';
import ensLogoBlue from '@/assets/ens-logo-blue.png';

interface ENSRegistrationCardProps {
  searchQuery: string;
}

export const ENSRegistrationCard = ({ searchQuery }: ENSRegistrationCardProps) => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ensName, setEnsName] = useState<string>('');

  useEffect(() => {
    const checkAvailability = async () => {
      // Only check if query is valid for ENS (no dots, alphanumeric, 3+ chars)
      if (!searchQuery || searchQuery.includes('.') || searchQuery.length < 3) {
        setIsAvailable(null);
        setEnsName('');
        return;
      }

      const cleanName = searchQuery.toLowerCase().trim();
      const fullName = `${cleanName}.eth`;
      setEnsName(fullName);
      setIsLoading(true);

      try {
        // Use ENS metadata API to check if name exists
        const response = await fetch(`https://metadata.ens.domains/mainnet/${fullName}/`);
        // If we get a 200, the name exists (registered)
        // If we get a 404, the name doesn't exist (available)
        setIsAvailable(response.status === 404);
      } catch (error) {
        console.error('ENS availability check error:', error);
        setIsAvailable(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, [searchQuery]);

  // Don't render if no valid search query
  if (!searchQuery || searchQuery.includes('.') || searchQuery.length < 3) {
    return null;
  }

  return (
    <Card className="w-full p-4 mb-4 bg-card border border-border/50 shadow-lg">
      <div className="flex items-center gap-4">
        {/* ENS Logo */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5298FF] to-[#3370CC] flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={ensLogoBlue} alt="ENS" className="w-10 h-10 object-contain" />
        </div>

        {/* Name Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-foreground truncate">{ensName}</h3>
            {isLoading ? (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Checking
              </Badge>
            ) : isAvailable === true ? (
              <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <Check className="w-3 h-3 mr-1" />
                Available
              </Badge>
            ) : isAvailable === false ? (
              <Badge variant="destructive" className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
                <X className="w-3 h-3 mr-1" />
                Registered
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAvailable === true 
              ? 'Register this ENS name on Ethereum'
              : isAvailable === false
              ? 'Buy on secondary market'
              : 'Ethereum Name Service (.eth)'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0">
          {isLoading ? (
            <Button disabled variant="outline" size="sm">
              <Loader2 className="w-4 h-4 animate-spin" />
            </Button>
          ) : isAvailable === true ? (
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-[#5298FF] to-[#3370CC] text-white hover:from-[#4288EF] hover:to-[#2260BC]"
              onClick={() => window.open(`https://app.ens.domains/${ensName}`, '_blank')}
            >
              Register
              <ExternalLink className="w-3 h-3 ml-1.5" />
            </Button>
          ) : isAvailable === false ? (
            <Button
              variant="outline"
              size="sm"
              className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              onClick={() => window.open(`https://grails.app/${searchQuery}`, '_blank')}
            >
              Buy on Grails
              <ExternalLink className="w-3 h-3 ml-1.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};
