import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Users, Calendar, MapPin, Hash, Share2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import poapLogo from '@/assets/poap-logo.png';

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

  const handleShare = () => {
    const shareUrl = `https://collectors.poap.xyz/token/${poap.tokenId}`;
    if (navigator.share) {
      navigator.share({
        title: poap.eventName,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#F5F5F7] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#6534FF] rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xl font-semibold text-gray-900">POAP</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors p-2 hover:bg-gray-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6">
          {/* POAP Image */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-2xl"></div>
              <img
                src={poap.eventImageUrl}
                alt={poap.eventName}
                className="relative w-64 h-64 rounded-full object-cover border-4 border-white shadow-lg"
              />
            </div>
          </div>

          {/* Event Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            {poap.eventName}
          </h2>

          {/* Event Metadata */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5 bg-gray-200/60 px-3 py-1.5 rounded-full">
              <Hash className="w-4 h-4" />
              <span>{poap.eventId}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-200/60 px-3 py-1.5 rounded-full">
              <Users className="w-4 h-4" />
              <span>{holders.length} Collectors</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-200/60 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
              </svg>
              <span>Ethereum</span>
            </div>
          </div>

          {/* Date */}
          {poap.eventStartDate && (
            <div className="flex items-center justify-center gap-2 mb-6 bg-gray-200/60 px-4 py-2.5 rounded-xl w-fit mx-auto">
              <Calendar className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-900">
                {formatDate(poap.eventStartDate)}
                {poap.eventEndDate && poap.eventEndDate !== poap.eventStartDate && 
                  `-${formatDate(poap.eventEndDate).split(' ')[1]}`}
                {poap.eventYear && `, ${poap.eventYear}`}
              </span>
            </div>
          )}

          {/* Description */}
          {poap.eventDescription && (
            <p className="text-gray-700 text-center text-sm leading-relaxed mb-8 max-w-md mx-auto">
              {poap.eventDescription}
            </p>
          )}

          {/* Holders Section */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {holders.length} Collector{holders.length !== 1 ? 's' : ''}
            </h3>

            {isLoadingHolders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6534FF]"></div>
              </div>
            ) : enrichedHolders.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">No holders found</p>
            ) : (
              <div className="space-y-3">
                {enrichedHolders.map((holder, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 border-2 border-gray-200">
                        <AvatarImage src={holder.avatar} alt={holder.displayName} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400 text-white font-semibold">
                          {holder.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-gray-900 font-semibold truncate">
                          {holder.displayName}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {holder.owner.id.slice(0, 6)}...{holder.owner.id.slice(-4)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleViewProfile(holder.owner.id)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-900 text-sm px-4 py-2 h-auto rounded-full font-medium flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!isLoadingHolders && enrichedHolders.length > 0 && enrichedHolders.length < holders.length && (
              <p className="text-center text-gray-500 text-xs mt-4">
                Showing first {enrichedHolders.length} of {holders.length} holders
              </p>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="grid grid-cols-2 gap-3 p-6 pt-4 border-t border-gray-200/80">
          <button
            onClick={() => window.open(`https://poap.gallery/event/${poap.eventId}`, '_blank')}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-gray-50 text-gray-900 rounded-2xl font-medium transition-all border border-gray-200"
          >
            <Globe className="w-4 h-4" />
            Website
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-gray-50 text-gray-900 rounded-2xl font-medium transition-all border border-gray-200"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};
