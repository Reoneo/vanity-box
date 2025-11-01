import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Users, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

interface PoapToken {
  tokenId: string;
  eventId: number;
  eventName: string;
  eventDescription?: string;
  eventImageUrl: string;
  eventYear?: number;
  eventStartDate?: string;
  eventEndDate?: string;
  eventCity?: string;
  eventCountry?: string;
}

interface PoapHolder {
  owner: {
    id: string;
    ens?: string;
  };
  tokenId: string;
}

interface PoapDetailModalProps {
  poap: PoapToken | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PoapDetailModal: React.FC<PoapDetailModalProps> = ({ poap, isOpen, onClose }) => {
  const [holders, setHolders] = useState<PoapHolder[]>([]);
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrichedHolders, setEnrichedHolders] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && poap) {
      fetchHolders();
    }
  }, [isOpen, poap]);

  const fetchHolders = async () => {
    if (!poap) return;
    
    setIsLoadingHolders(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-poap-holders', {
        body: { eventId: poap.eventId },
      });

      if (!error && data?.success) {
        setHolders(data.holders || []);
        
        // Enrich first 20 holders with web3.bio data
        const holdersToEnrich = (data.holders || []).slice(0, 20);
        const enriched = await Promise.all(
          holdersToEnrich.map(async (holder: PoapHolder) => {
            try {
              const address = holder.owner.id;
              const { data: bioData } = await supabase.functions.invoke('get-web3bio-profile', {
                body: { handle: address },
              });
              
              if (bioData && Array.isArray(bioData) && bioData.length > 0) {
                return { 
                  ...holder, 
                  web3bio: bioData[0],
                  displayName: bioData[0].displayName || holder.owner.ens || address,
                  avatar: bioData[0].avatar
                };
              }
            } catch (error) {
              console.error('Error fetching web3.bio for holder:', error);
            }
            return {
              ...holder,
              displayName: holder.owner.ens || holder.owner.id,
              avatar: null
            };
          })
        );
        setEnrichedHolders(enriched);
      }
    } catch (error) {
      console.error('Error fetching POAP holders:', error);
    } finally {
      setIsLoadingHolders(false);
    }
  };

  const handleViewProfile = (address: string) => {
    window.open(`/${address}`, '_blank');
  };

  if (!isOpen || !poap) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const filteredHolders = enrichedHolders.filter((holder) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      holder.owner.id.toLowerCase().includes(query) ||
      holder.owner.ens?.toLowerCase().includes(query) ||
      holder.displayName?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#D4AF37]/30">
          <div className="flex items-start gap-4 flex-1">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-xl blur-lg opacity-50"></div>
              <img
                src={poap.eventImageUrl}
                alt={poap.eventName}
                className="relative w-20 h-20 rounded-xl border-2 border-[#D4AF37] object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{poap.eventName}</h2>
              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                {poap.eventYear && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{poap.eventYear}</span>
                  </div>
                )}
                {(poap.eventCity || poap.eventCountry) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{[poap.eventCity, poap.eventCountry].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>
              {poap.eventStartDate && (
                <p className="text-sm text-gray-400 mt-1">
                  {formatDate(poap.eventStartDate)}
                  {poap.eventEndDate && poap.eventEndDate !== poap.eventStartDate && 
                    ` - ${formatDate(poap.eventEndDate)}`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Description */}
        {poap.eventDescription && (
          <div className="p-6 border-b border-[#D4AF37]/30">
            <p className="text-gray-300 text-sm leading-relaxed">{poap.eventDescription}</p>
          </div>
        )}

        {/* Holders Section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#D4AF37]/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                Holders ({holders.length})
              </h3>
              <a
                href={`https://collectors.poap.xyz/token/${poap.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#D4AF37] hover:text-[#F7E06C] transition-colors flex items-center gap-1"
              >
                View on POAP
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            
            <Input
              placeholder="Search holders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800/50 border-[#D4AF37]/30 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="overflow-y-auto p-6 space-y-2 flex-1">
            {isLoadingHolders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
              </div>
            ) : filteredHolders.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No holders found</p>
            ) : (
              filteredHolders.map((holder, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 border-2 border-[#D4AF37]/50">
                      <AvatarImage src={holder.avatar} alt={holder.displayName} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {holder.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-white font-medium truncate">
                        {holder.displayName}
                      </span>
                      {holder.owner.id !== holder.displayName && (
                        <span className="text-xs text-gray-400 truncate">
                          {holder.owner.id.slice(0, 6)}...{holder.owner.id.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleViewProfile(holder.owner.id)}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-xs px-3 py-1 h-auto"
                  >
                    View Profile
                  </Button>
                </div>
              ))
            )}
            {!isLoadingHolders && enrichedHolders.length < holders.length && (
              <p className="text-center text-gray-500 text-xs py-2">
                Showing first {enrichedHolders.length} of {holders.length} holders
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
