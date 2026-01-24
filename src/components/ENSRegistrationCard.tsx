/**
 * ENS Registration Card
 * Shows availability status and action buttons for ENS names
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Loader2, Check, X, User, ShoppingCart } from 'lucide-react';
import { useEnsAvailability } from '@/hooks/useEnsAvailability';
import { EnsRegisterModal } from '@/components/EnsRegisterModal';
import ensLogoBlue from '@/assets/ens-logo-blue.png';
import { format } from 'date-fns';

interface ENSRegistrationCardProps {
  searchQuery: string;
}

export const ENSRegistrationCard = ({ searchQuery }: ENSRegistrationCardProps) => {
  const navigate = useNavigate();
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  
  // Use onchain availability hook
  const { status, name, label, error, expiryDate } = useEnsAvailability(searchQuery);

  // Don't render if no valid search query or still idle
  if (!searchQuery || searchQuery.length < 3 || status === 'idle' || status === 'invalid') {
    return null;
  }

  return (
    <>
      <Card className="w-full p-4 mb-4 bg-card border border-border/50 shadow-lg">
        <div className="flex items-center gap-4">
          {/* ENS Logo */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5298FF] to-[#3370CC] flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={ensLogoBlue} alt="ENS" className="w-10 h-10 object-contain" />
          </div>

          {/* Name Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {status === 'loading' ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <h3 className="text-lg font-bold text-foreground truncate">{name}</h3>
              )}
              
              {status === 'loading' ? (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Checking
                </Badge>
              ) : status === 'available' ? (
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <Check className="w-3 h-3 mr-1" />
                  Available
                </Badge>
              ) : status === 'taken' ? (
                <Badge variant="destructive" className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
                  <X className="w-3 h-3 mr-1" />
                  Registered
                </Badge>
              ) : status === 'error' ? (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                  Error
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {status === 'available' 
                ? 'Register this ENS name on Ethereum'
                : status === 'taken'
                ? expiryDate 
                  ? `Expires ${format(expiryDate, 'MMM d, yyyy')}`
                  : 'View profile or make an offer'
                : status === 'error'
                ? error || 'Failed to check availability'
                : 'Ethereum Name Service (.eth)'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex gap-2">
            {status === 'loading' ? (
              <Button disabled variant="outline" size="sm">
                <Loader2 className="w-4 h-4 animate-spin" />
              </Button>
            ) : status === 'available' ? (
              // AVAILABLE: Single Register button -> opens in-app modal
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-[#5298FF] to-[#3370CC] text-white hover:from-[#4288EF] hover:to-[#2260BC]"
                onClick={() => setRegisterModalOpen(true)}
              >
                Register
              </Button>
            ) : status === 'taken' ? (
              // TAKEN: Two buttons - View Profile + Make Offer
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/${name}`)}
                >
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  View Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  onClick={() => window.open(`https://grails.app/${name}`, '_blank')}
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                  Make Offer
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Registration Modal */}
      <EnsRegisterModal
        open={registerModalOpen}
        onOpenChange={setRegisterModalOpen}
        name={name}
        label={label}
      />
    </>
  );
};
