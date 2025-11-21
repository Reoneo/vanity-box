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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-[#D4AF37]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6534FF] to-[#8B5CF6] rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-white">POAP</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-5">
          {/* POAP Image */}
          <div className="flex justify-center my-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/30 to-purple-500/30 rounded-full blur-3xl"></div>
              <img
                src={poap.eventImageUrl}
                alt={poap.eventName}
                className="relative w-56 h-56 rounded-full object-cover border-4 border-[#D4AF37]/40 shadow-2xl shadow-[#D4AF37]/20"
              />
            </div>
          </div>

          {/* Event Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-4 leading-tight">
            {poap.eventName}
          </h2>

          {/* Event Metadata */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4 text-sm">
            <div className="flex items-center gap-1.5 bg-white/5 border border-[#D4AF37]/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Hash className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-gray-300">{poap.eventId}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-[#D4AF37]/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-gray-300">{holders.length}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-[#D4AF37]/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <svg className="w-3.5 h-3.5 text-[#D4AF37]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
              </svg>
              <span className="text-gray-300">Ethereum</span>
            </div>
          </div>

          {/* Date */}
          {poap.eventStartDate && (
            <div className="flex items-center justify-center gap-2 mb-6 bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-4 py-2.5 rounded-xl w-fit mx-auto backdrop-blur-sm">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm font-medium text-white">
                {formatDate(poap.eventStartDate)}
                {poap.eventEndDate && poap.eventEndDate !== poap.eventStartDate && 
                  `-${formatDate(poap.eventEndDate).split(',')[0].split(' ')[1]}`}
                {poap.eventYear && `, ${poap.eventYear}`}
              </span>
            </div>
          )}

          {/* Description */}
          {poap.eventDescription && (
            <p className="text-gray-300 text-center text-sm leading-relaxed mb-8 max-w-md mx-auto">
              {poap.eventDescription}
            </p>
          )}

          {/* Holders Section */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[#D4AF37]">{holders.length}</span> 
              <span>Collector{holders.length !== 1 ? 's' : ''}</span>
            </h3>

            {isLoadingHolders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
              </div>
            ) : enrichedHolders.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">No holders found</p>
            ) : (
              <div className="space-y-2.5">
                {enrichedHolders.map((holder, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-11 w-11 border-2 border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10">
                        <AvatarImage src={holder.avatar} alt={holder.displayName} />
                        <AvatarFallback className="bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] text-black font-bold text-sm">
                          {holder.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white font-semibold truncate text-sm">
                          {holder.displayName}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          {holder.owner.id.slice(0, 6)}...{holder.owner.id.slice(-4)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleViewProfile(holder.owner.id)}
                      className="bg-[#D4AF37] hover:bg-[#F7E06C] text-black text-xs px-3.5 py-2 h-auto rounded-full font-semibold flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 transition-all group-hover:scale-105"
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
        <div className="grid grid-cols-2 gap-3 p-5 pt-4 border-t border-[#D4AF37]/20">
          <button
            onClick={() => window.open(`https://poap.gallery/event/${poap.eventId}`, '_blank')}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37]/50 text-white rounded-xl font-medium transition-all"
          >
            <Globe className="w-4 h-4" />
            Website
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37]/50 text-white rounded-xl font-medium transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};
