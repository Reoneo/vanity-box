import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
