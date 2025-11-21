import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PoapDetailModal } from "@/components/PoapDetailModal";

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

interface PoapCarouselProps {
  walletAddress: string;
}

export const PoapCarousel: React.FC<PoapCarouselProps> = ({ walletAddress }) => {
  const [poaps, setPoaps] = useState<PoapToken[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoap, setSelectedPoap] = useState<PoapToken | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPoaps = async () => {
      if (!walletAddress) return;
      
      setIsLoading(true);
      try {
        // Use edge function to fetch POAPs with authentication
        const { data, error } = await supabase.functions.invoke('get-poap-data', {
          body: { walletAddress },
        });

        if (!error && data?.success) {
          // Map the POAP data to our format
          const formattedPoaps: PoapToken[] = (data.poaps || []).map((poap: any) => ({
            tokenId: poap.tokenId,
            eventId: poap.event?.id,
            eventName: poap.event?.name || 'Unknown Event',
            eventDescription: poap.event?.description,
            eventImageUrl: poap.event?.image_url || '',
            eventYear: poap.event?.year,
            eventStartDate: poap.event?.start_date,
            eventEndDate: poap.event?.end_date,
            eventCity: poap.event?.city,
            eventCountry: poap.event?.country,
          }));
          setPoaps(formattedPoaps);
        } else {
          console.error("Error fetching POAPs:", error);
        }
      } catch (error) {
        console.error("Error fetching POAPs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoaps();
  }, [walletAddress]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (poaps.length === 0) return null;

    // Count event types (extract category from event name)
    const eventTypeCount: { [key: string]: number } = {};
    
    poaps.forEach((poap) => {
      // Try to categorize events by common keywords
      const name = poap.eventName.toLowerCase();
      let category = 'Other';
      
      if (name.includes('conference') || name.includes('summit')) category = 'Conference';
      else if (name.includes('meetup') || name.includes('gathering')) category = 'Meetup';
      else if (name.includes('workshop') || name.includes('tutorial')) category = 'Workshop';
      else if (name.includes('hackathon') || name.includes('hack')) category = 'Hackathon';
      else if (name.includes('concert') || name.includes('music')) category = 'Concert';
      else if (name.includes('art') || name.includes('gallery')) category = 'Art';
      else if (name.includes('gaming') || name.includes('game')) category = 'Gaming';
      else if (name.includes('nft') || name.includes('mint')) category = 'NFT';
      
      eventTypeCount[category] = (eventTypeCount[category] || 0) + 1;
    });

    // Get top event type
    const sortedTypes = Object.entries(eventTypeCount)
      .sort(([, a], [, b]) => b - a);
    
    const topEventType = sortedTypes[0];
    
    // Get years distribution
    const years = poaps
      .map(p => p.eventYear)
      .filter((year): year is number => year !== undefined);
    const uniqueYears = [...new Set(years)].length;

    return {
      total: poaps.length,
      topEventType: topEventType ? topEventType[0] : 'Various',
      topEventCount: topEventType ? topEventType[1] : 0,
      yearsActive: uniqueYears,
    };
  }, [poaps]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % poaps.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + poaps.length) % poaps.length);
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (poaps.length === 0) {
    return null;
  }

  const currentPoap = poaps[currentIndex];

  const handlePoapClick = () => {
    setSelectedPoap(currentPoap);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="w-full py-3 flex-shrink-0">
        {/* Statistics Header */}
        {statistics && (
          <div className="mb-3 px-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#D4AF37]" />
                <span className="text-gray-400">Total:</span>
                <span className="text-[#D4AF37] font-semibold">{statistics.total}</span>
              </div>
              <div className="text-gray-400">
                {statistics.topEventType !== 'Other' && (
                  <>
                    <span className="text-gray-500">Top:</span>{' '}
                    <span className="text-[#D4AF37]">{statistics.topEventType}</span>
                    <span className="text-gray-500 ml-1">({statistics.topEventCount})</span>
                  </>
                )}
                {statistics.yearsActive > 0 && (
                  <span className="ml-2 text-gray-500">
                    {statistics.yearsActive} {statistics.yearsActive === 1 ? 'year' : 'years'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Carousel */}
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={goToPrev}
            disabled={poaps.length <= 1}
            className="h-8 w-8 p-0 hover:bg-gray-700/50 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
          </Button>

          <button
            onClick={handlePoapClick}
            className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#D4AF37]/50 group-hover:border-[#D4AF37] transition-colors group-hover:scale-105 transform duration-200">
              <img
                src={currentPoap.eventImageUrl}
                alt={currentPoap.eventName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-300 line-clamp-1 max-w-[150px] group-hover:text-[#D4AF37] transition-colors">
                {currentPoap.eventName}
              </p>
              {poaps.length > 1 && (
                <p className="text-[10px] text-gray-500">
                  {currentIndex + 1} of {poaps.length}
                </p>
              )}
            </div>
          </button>

          <Button
            size="sm"
            variant="ghost"
            onClick={goToNext}
            disabled={poaps.length <= 1}
            className="h-8 w-8 p-0 hover:bg-gray-700/50 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
          </Button>
        </div>
      </div>

      <PoapDetailModal
        poap={selectedPoap}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPoap(null);
        }}
      />
    </>
  );
};
